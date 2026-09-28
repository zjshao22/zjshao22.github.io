"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ListTree,
  Maximize,
  Minimize,
  Presentation,
  X,
} from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { PRESENTER_OPEN_EVENT } from "./trigger";

interface PresenterProps {
  title: string;
  description?: string;
}

/** 一页 = #presenter-content 顶层兄弟块的一个连续切片，整体高度 <= 屏高 */
type Page = {
  blocks: HTMLElement[];
  /** 各块的语义类型（与 blocks 同序），字号策略按它判定 */
  kinds: BlockKind[];
  /** 所属小节标题（页首的 h1/h2/h3 文本，无则沿用上一屏），用于顶栏提示与目录 */
  section: string | null;
  /** 标题级别 1/2/3（与 section 同源），无标题组为 0，目录浮层按此缩进 */
  level: number;
  /**
   * 长代码块被按行拆到多屏时，本屏显示的**行下标区间**（闭区间）。
   * 有它时本页只有一个块，且只显示这个行范围，其余行 display:none。
   */
  lines?: [number, number];
  /** 长表格按正文行分页；每屏保留原表头，不改动内容顺序。 */
  rows?: [number, number];
  /** 拆行页的实测高度（这样的页量不到「整块」的自然高，缓存下来供审计/居中用） */
  naturalH?: number;
  /**
   * 本页静态字号倍率（内容稀少的页 > 1，其余为 1）。
   * 打包时一次性判定并存入页面对象：页内揭示过程永不变，翻页只是静态切换，
   * 不做运行态测量/过渡，避免字号抖动。放大后若因折行超高，
   * applyPageZoom 会把收敛后的值写回这里。
   */
  zoom: number;
};

/** 内容占屏高 ≤ 该比例即视为稀少页，放大字号 */
const LIGHT_PAGE_RATIO = 0.6;
const LIGHT_ZOOM_MIN = 1.15;
/** 稀疏页适度放大；限制在 1.35，避免字号随页面密度产生过大的变化。 */
const LIGHT_ZOOM_MAX = 1.35;
/** 含代码/表格/图片的页放大幅度小一些，避免少数几行很宽的代码横向溢出 */
const LIGHT_ZOOM_MAX_FIXED = 1.12;

const marginTopOf = (el: HTMLElement) =>
  parseFloat(getComputedStyle(el).marginTop) || 0;

/* ===== 分页 DP 参数 =====
 * 贪心 first-fit 的固有毛病是「把一页塞到极限，剩余尾巴碎成一页」——
 * 「一屏只有一行」正是这么来的。DP 在整段上最小化总代价，天然抑制
 * 「一页极满 + 一页极空」。代价单位统一为「页」的当量：1.0 ≈ 多一屏的代价。 */

/** 页高硬余量，占可用高的比例（1080p 下约 12px）：只保证内容（border box）落在
 *  屏内，吸收取整误差。末块的透明下边距不计入（溢出被 overflow hidden 裁掉不可见）。
 *  必须是比例而非 px——px 常量在 4K 下相对值减半，会让两种分辨率的断屏点漂移。 */
const DP_SLACK_RATIO = 0.013;
/** 目标填充率：偏离它按平方受罚，让整段的屏都差不多满 */
const TARGET_FILL = 0.85;
/** 多一屏的固定代价（页数旋钮：调大更倾向少屏） */
const W_PAGE = 0.4;
/** 填充率偏离目标的平方惩罚权重（防碎屏的主项） */
const W_SLACK = 1.0;
/** h1/h2 会在采集阶段成为硬边界；h3 仍可接在同一主章节里，但不应轻易混屏。 */
const W_HEAD_MID_H3 = 1.1;
/** 页尾悬空：末块是标题，或整页只有一个标题 */
const W_HEAD_ORPHAN = 2.0;
/** 页尾短引句（「输出：」这类）与它引出的代码/交互块被拆到两屏 */
const W_LEAD_SPLIT = 1.2;
/** 两个交互块（Quiz/CodeRunner）同屏：课堂提问需要一屏一题 */
const W_INT_PAIR = 4;
/** 交互块与「足量正文」同屏：编辑器和题目要留出操作空间 */
const W_INT_MIX = 1.1;
/** 「足量正文」门槛：低于屏高这个比例的块算短提示，允许与交互块同屏防碎屏。 */
const MIX_MIN_RATIO = 0.15;
/** 引句判定：字数上限；超过它说明这本身就是一段正文，不算引句 */
const LEAD_MAX_CHARS = 40;

function isHeading(el: Element) {
  const t = el.tagName;
  return t === "H1" || t === "H2" || t === "H3";
}

/**
 * 块的语义类型——影响分页代价与字号策略。
 * 判定顺序重要：CodeRunner 的输出区也是 <pre>，交互判定必须先于 code，
 * 否则会被当成普通代码块（少掉「不与正文混排」的约束）。
 */
type BlockKind =
  | "heading"
  | "formula"
  | "quiz"
  | "interactive"
  | "code"
  | "table"
  | "media"
  | "text"
  | "other";

function classifyBlock(el: HTMLElement): BlockKind {
  if (isHeading(el)) return "heading";
  if (el.classList.contains("katex-display")) return "formula";
  if (el.classList.contains("code-runner")) return "interactive";
  // Quiz 与 CodeRunner 分开保留分页策略，布局上都服从课堂内容列。
  if (el.querySelector('[role="radiogroup"]')) return "quiz";
  if (el.querySelector("textarea, video, canvas, iframe")) return "interactive";
  if (el.tagName === "FIGURE" && el.querySelector("pre")) return "code";
  // 只识别纯表格容器；包含讲解、答案或交互的复合块不拆开。
  if (
    el.tagName === "TABLE" ||
    (el.querySelector("table") && !el.querySelector("p, details, pre"))
  ) {
    return "table";
  }
  // 表格常被 fumadocs 包一层 overflow 容器，块顶层未必是 table 本身。
  // SVG 图示（DigitalizationFigures / ModClock / NumberLine 等）是 div > svg 或
  // figure > svg，用 `:scope > svg` 认直接子元素；但必须同时「块内没有正文」——
  // 否则 Callout 会被误判（它的图标 svg 正是顶层 div 的直接子元素），
  // 白白把提示框放成全宽。
  const bodySel = 'p, pre, ul, ol, h1, h2, h3, textarea, [role="radiogroup"]';
  if (
    el.tagName === "TABLE" ||
    el.tagName === "IMG" ||
    (el.tagName.toLowerCase() === "svg" &&
      el.querySelector(bodySel) === null) ||
    (el.querySelector(":scope > svg") !== null &&
      el.querySelector(bodySel) === null) ||
    (el.querySelector("table, img") !== null &&
      el.querySelector(bodySel) === null)
  ) {
    return "media";
  }
  if (
    el.tagName === "P" ||
    el.tagName === "UL" ||
    el.tagName === "OL" ||
    el.tagName === "BLOCKQUOTE"
  ) {
    return "text";
  }
  return "other";
}

/** 元素实际占用的内容高度；scrollHeight 可覆盖绝对定位/内部晚加载造成的盒外内容。 */
const renderedHeightOf = (el: HTMLElement) =>
  Math.max(el.offsetHeight, el.scrollHeight);

/** 一个原子块（顶层元素）及其实测几何。分页的最小单位，不再细分。 */
type Atom = {
  el: HTMLElement;
  kind: BlockKind;
  /** 顶边（含上外边距）——flex 列容器里 margin 不塌陷，页高按它起算 */
  top: number;
  /** 底边（含下外边距） */
  bottom: number;
  /** 内容底边（不含下外边距）：溢出判定用，透明下边距溢出会被裁掉、不算问题 */
  contentBottom: number;
  /** 标题级别 1/2/3，非标题为 0 */
  level: number;
  heading: boolean;
  text: string;
};

/**
 * 顶层块序列 + 语义断屏边界（下标 i 表示「第 i 个块之前」）。
 * 和 Reveal.js / Slidev / Marp 一样，作者写下的 `---` 是明确的幻灯片边界；
 * h1/h2 也开启新主题。自动分页只在这些语义段内部工作，不再为了填满屏幕混合主题。
 */
type BlockList = {
  atoms: Atom[];
  hardAt: Set<number>;
};

/** 采集顶层块，记录语义边界（HR/手写标记本身不参与分页） */
function collectBlocks(container: HTMLElement): BlockList {
  const atoms: Atom[] = [];
  const hardAt = new Set<number>();
  const marginBottomOf = (el: HTMLElement) =>
    parseFloat(getComputedStyle(el).marginBottom) || 0;

  for (const child of Array.from(container.children) as HTMLElement[]) {
    if (child.tagName === "HR") {
      hardAt.add(atoms.length);
      continue;
    }
    if (child.hasAttribute("data-presenter-break")) {
      hardAt.add(atoms.length);
      continue;
    }
    const kind = classifyBlock(child);
    const level = kind === "heading" ? parseInt(child.tagName.slice(1), 10) : 0;
    if (atoms.length > 0 && (level === 1 || level === 2))
      hardAt.add(atoms.length);
    // 给 CSS 用：各类型共享内容列，公式等按语义使用自己的适配规则。
    child.setAttribute("data-pr-kind", kind);
    // KaTeX 的长公式默认提供横向滚动；投影时滚动条等于把公式后半截藏起来。
    // 只缩该公式到自己的可读列宽，避免拖累同屏正文，也不改变其它块的字号。
    child.style.removeProperty("--pr-fit");
    if (kind === "formula" && child.scrollWidth > child.clientWidth + 1) {
      child.style.setProperty(
        "--pr-fit",
        String(Math.max(0.72, (child.clientWidth / child.scrollWidth) * 0.98)),
      );
    }
    const top = child.offsetTop;
    const contentBottom = top + renderedHeightOf(child);
    atoms.push({
      el: child,
      kind,
      top: top - marginTopOf(child),
      bottom: contentBottom + marginBottomOf(child),
      contentBottom,
      level,
      heading: kind === "heading",
      text: (child.textContent || "").trim(),
    });
  }
  return { atoms, hardAt };
}

function containerUsable(container: HTMLElement) {
  const cs = getComputedStyle(container);
  return (
    container.clientHeight -
    (parseFloat(cs.paddingTop) || 0) -
    (parseFloat(cs.paddingBottom) || 0)
  );
}

function containerUsableWidth(container: HTMLElement) {
  const cs = getComputedStyle(container);
  return (
    container.clientWidth -
    (parseFloat(cs.paddingLeft) || 0) -
    (parseFloat(cs.paddingRight) || 0)
  );
}

/**
 * 上一次同步时可见的块。用来识别「这一屏新出现的段」，给它加一次性到达动效。
 * 模块级即可——同一时刻只会有一个演示在跑；打开演示时重置。
 */
let prevVisibleBlocks = new Set<HTMLElement>();

/** 按当前状态同步 DOM 显隐：只显示「当前页 + 已揭示块」，并处理超高单块缩放 */
function syncVisibility(
  el: HTMLElement,
  pages: Page[],
  hrs: HTMLElement[],
  index: number,
  revealed: Record<number, number>,
  dispatchEditorResize = true,
) {
  // 长代码块拆行：先把所有被拆块的全部行恢复，再按当前页隐藏范围外的行。
  // 必须在下面的「超高单块缩放」之前完成——缩放量的是块的实际高度，
  // 而拆行后的高度才是这一屏真正要显示的高度。
  const chunked = new Set<HTMLElement>();
  pages.forEach((p) => {
    if (p.lines) chunked.add(p.blocks[0]);
  });
  chunked.forEach((fig) => {
    lineSpansOf(fig).forEach((l) => {
      l.style.removeProperty("display");
      l.removeAttribute("data-pr-lineno");
    });
    fig.removeAttribute("data-pr-cont");
  });
  const current = pages[index - 1];
  el.querySelectorAll("[data-pr-row-hidden]").forEach((row) =>
    row.removeAttribute("data-pr-row-hidden"),
  );
  if (current?.rows) {
    const [from, to] = current.rows;
    tableRowsOf(current.blocks[0]).forEach((row, i) => {
      if (i < from || i > to) row.setAttribute("data-pr-row-hidden", "");
    });
  }
  if (current?.lines) {
    const fig = current.blocks[0];
    const [from, to] = current.lines;
    const spans = lineSpansOf(fig);
    spans.forEach((l, i) => {
      if (i < from || i > to) {
        l.style.display = "none";
        l.removeAttribute("data-pr-lineno");
      } else {
        // 行号接着上一屏数：隐藏的行不生成 ::before、CSS 计数器不自增，
        // 不覆盖的话续屏会从 1 重新编号（见 global.css 的 data-pr-lineno）
        l.setAttribute("data-pr-lineno", String(i + 1));
      }
    });
    // 拆成几屏就标「续 2 / 3」，让台下知道代码还没完
    const total = pages.filter((p) => p.blocks[0] === fig).length;
    const seq = pages.slice(0, index).filter((p) => p.blocks[0] === fig).length;
    if (total > 1 && seq > 1)
      fig.setAttribute("data-pr-cont", `续 ${seq} / ${total}`);
  }

  // 先算出「本屏应当可见的块」集合，再统一写属性。
  // 不能逐屏写：长代码块拆行后**同一个元素被多屏引用**，逐屏写的最后一面（非当前屏）
  // 会把元素重新隐藏，整屏就空白了。
  const visibleBlocks = new Set<HTMLElement>();
  if (index > 0 && pages[index - 1]) {
    const cur = pages[index - 1];
    const k = Math.min(revealed[index] ?? 0, cur.blocks.length - 1);
    cur.blocks.forEach((block, b) => {
      if (b <= k) visibleBlocks.add(block);
    });
  }
  pages.forEach((page) => {
    page.blocks.forEach((block) => {
      if (visibleBlocks.has(block)) block.removeAttribute("data-pr-hidden");
      else block.setAttribute("data-pr-hidden", "");
    });
  });
  // 到达动效：给「这一屏新出现的段」加一次性动画（淡入 + 轻微上移），
  // 引导视线后立刻回到静态纸面——不留常驻底色，快速连按翻页也不会跳闪。
  // 重新可见（比如退回上一屏再前进）会重新播；只是重打包（resize/字体就绪）则保持不变。
  pages.forEach((page, i) => {
    const isCurrent = i + 1 === index;
    page.blocks.forEach((block) => {
      const isVisible = isCurrent && visibleBlocks.has(block);
      if (isVisible && !prevVisibleBlocks.has(block)) {
        // 单块屏用纯淡入：单块超屏时会被等比缩放（transform 写在块上），
        // 位移动画会覆盖它，结束后再「啪」地跳回缩放位
        const solo = page.blocks.length === 1;
        block.setAttribute("data-pr-fresh", solo ? "fade" : "rise");
      } else if (!isVisible) {
        block.removeAttribute("data-pr-fresh");
      }
    });
  });
  prevVisibleBlocks = visibleBlocks;
  // 超高或超宽单块：等比缩小到可用屏高/屏宽，并垂直居中。
  // 只处理「当前屏唯一的那个块」——拆行页共用同一个元素，逐屏处理会互相覆盖；
  // 其余块上残留的缩放痕迹一律清掉。
  const soloPage = index > 0 ? pages[index - 1] : undefined;
  const soloBlock =
    soloPage &&
    soloPage.blocks.length === 1 &&
    !soloPage.lines &&
    !soloPage.rows
      ? soloPage.blocks[0]
      : null;
  pages.forEach((page) =>
    page.blocks.forEach((b) => {
      if (b === soloBlock) return;
      if (b.hasAttribute("data-pr-oversized")) {
        b.removeAttribute("data-pr-oversized");
        b.style.removeProperty("--pr-scale");
        b.style.removeProperty("--pr-mt");
      }
    }),
  );
  if (soloBlock && !soloBlock.hasAttribute("data-pr-hidden")) {
    const h = renderedHeightOf(soloBlock);
    const usable = containerUsable(el);
    const wLimit = containerUsableWidth(el);
    const w = Math.max(soloBlock.offsetWidth, soloBlock.scrollWidth);
    if (h > usable || w > wLimit) {
      // 位置量的是「未加偏移时的自然位置」：现有 --pr-mt 的位移要减掉，
      // 否则重复计算会把上次的位移当成自然位置，块在居中位与原始位之间来回跳
      const curMt =
        parseFloat(soloBlock.style.getPropertyValue("--pr-mt")) || 0;
      const curTop =
        soloBlock.getBoundingClientRect().top -
        el.getBoundingClientRect().top -
        (parseFloat(getComputedStyle(el).paddingTop) || 0) -
        curMt;
      // 缩放预算要扣除块自身在页内的位置（含首块上边距）：只按屏高缩放的话，
      // 块顶部若自带偏移，底边仍会越出容器被裁掉
      const scale = Math.min((usable - Math.max(0, curTop)) / h, wLimit / w, 1);
      if (scale > 0 && scale < 1) {
        soloBlock.setAttribute("data-pr-oversized", "");
        soloBlock.style.setProperty("--pr-scale", String(scale));
        soloBlock.style.setProperty(
          "--pr-mt",
          `${Math.max(0, (usable - h * scale) / 2 - curTop)}px`,
        );
      }
    }
  }
  // 放映中分隔横线全程不呈现
  hrs.forEach((h) => h.setAttribute("data-pr-hidden", ""));
  // 触发被 display:none 挂起过的编辑器（Monaco 等）重新布局。
  // repack 里重复应用同一显隐状态时传 false：否则 resize → repack → resize 会自我循环
  if (dispatchEditorResize) window.dispatchEvent(new Event("resize"));
}

/**
 * 应用本页的静态字号倍率与垂直居中（稀少页像 PPT 那样居中摆放）。
 *
 * 居中的三个坑：
 * ① 不能用 flex 的 justify-content:center——页内逐段揭示时隐藏块是 display:none，
 *    内容每揭示一段就变高、整体重新居中，已显示的文字会阶梯式上移；
 * ② 不能用 margin/padding——它们参与布局、改变块的 offsetTop，污染重打包测量
 *    （测量要临时恢复全部块量完整高度），分页错乱会让画面周期性抽动；
 * ③ 不能只 transform 首块——transform 不改变兄弟块的位置，首块会压在第二块上。
 * 正确做法：量出「整页完整高度」后，把差值一半作为 **transform: translateY**
 * 加在整个容器上——整页内容一起下移居中，只影响绘制不参与布局：
 * 测量永远干净、揭示时偏移恒定、文字在原地出现不会移动。
 * 偏移不可复用（每页高度不同），由本函数每次进入页面时重算并设置。
 *
 * 居中与放大解耦：只要屏幕有余量就居中（不再只在 zoom>1 时）。Quiz / CodeRunner
 * 页恒为 zoom=1（固定尺寸控件不能缩放），一屏一题时下面会空掉一大片，
 * 顶端对齐会显得内容「掉」在屏幕上方。
 */
function applyPageZoom(el: HTMLElement, page: Page | undefined) {
  const usable = containerUsable(el);

  if (!page) {
    el.style.setProperty("--pr-zoom", "1");
    el.style.removeProperty("transform");
    return;
  }

  const rehide = page.blocks.filter((b) => b.hasAttribute("data-pr-hidden"));
  rehide.forEach((b) => b.removeAttribute("data-pr-hidden"));
  const marginBottomOf = (x: HTMLElement) =>
    parseFloat(getComputedStyle(x).marginBottom) || 0;

  // 放大字号会让文字变宽、重新折行，页高不是线性增长——按 zoom=1 时的比例算出的倍率
  // 可能撑爆一屏。这里量出实际高度再收敛（最多 3 轮），把收敛值写回 page.zoom：
  // 重打包在 zoom=1 下测高，不受影响；再进入本页时直接用缓存值，不再重算。
  // --pr-zoom 与 transform 都不参与布局，不会污染重打包测量。
  let zoom = page.zoom;
  let fullH = 0;
  for (let iter = 0; iter < 3; iter++) {
    el.style.setProperty("--pr-zoom", String(zoom));
    fullH = pageHeight(page, marginBottomOf);
    if (fullH <= usable) break;
    // zoom=1 时页高由分页 DP 保证不超屏，因此这一步必然收敛；到 1 就停，不再空转
    if (zoom <= 1) break;
    zoom = Math.max(1, zoom * 0.95 * (usable / fullH));
  }
  if (page.zoom !== zoom) page.zoom = zoom;
  rehide.forEach((b) => b.setAttribute("data-pr-hidden", ""));

  const offset = (usable - fullH) / 2;
  if (offset > 1) el.style.transform = `translateY(${offset}px)`;
  else el.style.removeProperty("transform");
}

/**
 * 一组块在正常文档流里的自然高度（首块上外边距 → 末块底边 + 下边距）。
 * 首块的上外边距在 flex 容器里不塌陷、同样占屏，必须计入，
 * 否则分页按「顶边起算」低估高度，末尾内容会溢出容器被裁掉。
 */
function pageNaturalH(
  blocks: HTMLElement[],
  marginBottomOf: (el: HTMLElement) => number,
) {
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  return (
    last.offsetTop +
    renderedHeightOf(last) +
    marginBottomOf(last) -
    first.offsetTop +
    marginTopOf(first)
  );
}

/** 调试快照开关：只在 ?prdebug=1 下计算，普通放映零开销 */
let debugEnabled: boolean | null = null;
function isDebugEnabled() {
  if (debugEnabled === null) {
    try {
      debugEnabled = new URLSearchParams(window.location.search).has("prdebug");
    } catch {
      debugEnabled = false;
    }
  }
  return debugEnabled;
}

/** 该块是不是开启一个明确的语义段（HR / 手写标记 / h1-h2） */
function breakBeforeOf(
  block: HTMLElement,
): "hr" | "marker" | "heading" | "none" {
  if (block.tagName === "H1" || block.tagName === "H2") return "heading";
  const prev = block.previousElementSibling;
  if (!prev) return "none";
  if (prev.tagName === "HR") return "hr";
  if (prev instanceof HTMLElement && prev.hasAttribute("data-presenter-break"))
    return "marker";
  return "none";
}

/**
 * 把当前分页结果发布到 window.__PR_DEBUG，供 scripts/presenter-audit.mjs 量化审计
 * （填充率、溢出、碎屏、字号、段边界闭合）。只在 ?prdebug=1 时工作。
 */
function publishDebug(
  el: HTMLElement,
  pages: Page[],
  index: number,
  packVer: number,
) {
  if (!isDebugEnabled()) return;
  // 与打包测量同一纪律：隐藏块 offset 为 0，必须让所有块同时可见才能量准；
  // 同一 JS 任务内摘除再恢复，浏览器不会在中途绘制，不闪屏
  const wasHidden: HTMLElement[] = [];
  pages.forEach((p) =>
    p.blocks.forEach((b) => {
      if (b.hasAttribute("data-pr-hidden")) {
        wasHidden.push(b);
        b.removeAttribute("data-pr-hidden");
      }
    }),
  );
  const usable = containerUsable(el);
  const usableWidth = containerUsableWidth(el);
  const marginBottomOf = (x: HTMLElement) =>
    parseFloat(getComputedStyle(x).marginBottom) || 0;
  // 顶层块序号（与审计脚本的 filter(c => c.tagName !== 'HR') 对齐），
  // 让脚本能在页外直接把「屏」映射回 DOM 元素量字号，不必逐屏翻页
  const tops = (Array.from(el.children) as HTMLElement[]).filter(
    (c) => c.tagName !== "HR",
  );
  const topIndex = new Map(tops.map((b, i) => [b, i]));
  const payload = {
    lesson: window.location.pathname,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    usable: Math.round(usable),
    packVer,
    index,
    total: pages.length + 1,
    pages: pages.map((page, i) => {
      const first = page.blocks[0];
      const last = page.blocks[page.blocks.length - 1];
      const contentBottom =
        last.offsetTop +
        renderedHeightOf(last) -
        (first.offsetTop - marginTopOf(first));
      const h = pageHeight(page, marginBottomOf);
      const overflowX = Math.max(
        0,
        ...page.blocks.map((block) =>
          Math.max(
            block.scrollWidth - block.clientWidth,
            block.scrollWidth - usableWidth,
          ),
        ),
      );
      // 单块自身超屏的屏：由 syncVisibility 的等比缩放兜底（data-pr-oversized），
      // 换算成缩放后的等效高度后不算溢出，但单独计数以便观察。拆行页不算兜底。
      const oversize =
        !page.lines &&
        !page.rows &&
        page.blocks.length === 1 &&
        (contentBottom > usable || overflowX > 0);
      return {
        n: i + 1,
        oversize,
        section: page.section,
        level: page.level,
        kinds: page.blocks.map(classifyBlock),
        blockIdx: page.blocks.map((b) => topIndex.get(b) ?? -1),
        blocks: page.blocks.length,
        textLen: page.blocks
          .map((b) => b.textContent || "")
          .join("")
          .trim().length,
        preview: page.blocks
          .map((b) => (b.textContent || "").trim())
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120),
        height: Math.round(h),
        fillRatio: Number((h / usable).toFixed(3)),
        // 拆行页的高度取的是分片高度，不能再用 DOM 的 contentBottom（含未显示的行）
        overflowPx:
          oversize || page.lines || page.rows
            ? 0
            : Math.max(0, Math.round(contentBottom - usable)),
        overflowXPx: oversize ? 0 : Math.max(0, Math.round(overflowX)),
        zoom: page.zoom,
        rowRange: page.rows,
        lineRange: page.lines,
        breakBefore: breakBeforeOf(first),
        // 页内出现任何语义边界都表示硬约束没有生效。
        boundaryInside: page.blocks
          .slice(1)
          .some((b) => breakBeforeOf(b) !== "none"),
        hrCrossed: page.blocks.slice(1).filter((b) => breakBeforeOf(b) === "hr")
          .length,
      };
    }),
  };
  wasHidden.forEach((b) => b.setAttribute("data-pr-hidden", ""));
  (window as unknown as Record<string, unknown>).__PR_DEBUG = payload;
}

/** 由一段连续块生成一页：内容稀少且不含固定尺寸控件时放大字号 */
function makePage(
  atoms: Atom[],
  section: string | null,
  level: number,
  usable: number,
): Page {
  const naturalH = atoms[atoms.length - 1].bottom - atoms[0].top;
  const kinds = atoms.map((a) => a.kind);
  let zoom = 1;
  // 交互控件（Quiz 选项 / CodeRunner 编辑器）是固定尺寸控件，整体放大会变形
  const hasFixedControl =
    kinds.includes("interactive") || kinds.includes("quiz");
  if (
    naturalH > 0 &&
    naturalH <= usable * LIGHT_PAGE_RATIO &&
    !hasFixedControl
  ) {
    const max = kinds.some(
      (k) => k === "code" || k === "table" || k === "media",
    )
      ? LIGHT_ZOOM_MAX_FIXED
      : LIGHT_ZOOM_MAX;
    zoom = Math.min(Math.max((usable * 0.85) / naturalH, LIGHT_ZOOM_MIN), max);
  }
  return { blocks: atoms.map((a) => a.el), kinds, section, level, zoom };
}

/**
 * 一页的语义代价：本段优先同屏的内容不该被拆开，无关的不该挤一起。
 * 每项都对应一条具体的观感要求（见各常量注释），单位是「页」的当量。
 */
function pagePenalty(
  atoms: Atom[],
  j: number,
  i: number,
  usable: number,
): number {
  const last = atoms[i - 1];
  let p = 0;

  // ① h1/h2 已是硬边界；h3 是子题，只有非常短时才允许接在上一内容后
  for (let k = j + 1; k < i; k++) {
    if (atoms[k].level === 3) p += W_HEAD_MID_H3;
  }
  // ② 页尾悬空：标题落在页尾——它带的内容跑到了下一屏；整页只有标题更糟
  if (last.heading) p += W_HEAD_ORPHAN;
  // ③ 引句（「输出：」这类）与它引出的代码/交互块被拆到两屏
  if (i < atoms.length && !last.heading) {
    const nextKind = atoms[i].kind;
    if (
      (nextKind === "code" ||
        nextKind === "interactive" ||
        nextKind === "quiz" ||
        nextKind === "media" ||
        nextKind === "table" ||
        nextKind === "formula") &&
      (last.text.length <= LEAD_MAX_CHARS || /[:：]$/.test(last.text))
    ) {
      p += W_LEAD_SPLIT;
    }
  }
  // ④ 交互块（Quiz / CodeRunner）：一屏一题，且要与足量正文分开留出操作空间
  const isActivity = (kind: BlockKind) =>
    kind === "interactive" || kind === "quiz";
  let ints = 0;
  for (let k = j; k < i; k++) if (isActivity(atoms[k].kind)) ints++;
  if (ints >= 2) p += W_INT_PAIR * (ints - 1);
  if (ints >= 1) {
    const total = atoms[i - 1].bottom - atoms[j].top;
    for (let k = j; k < i; k++) {
      if (!isActivity(atoms[k].kind)) continue;
      if (total - (atoms[k].bottom - atoms[k].top) >= usable * MIX_MIN_RATIO) {
        p += W_INT_MIX;
        break;
      }
    }
  }
  return p;
}

/**
 * 全篇最优分页：线性划分 DP。
 *
 *   dp[i] = min over j { dp[j] + W_PAGE + W_SLACK·(目标填充 − 实际填充)²
 *                            + pagePenalty(j,i) }
 *
 * 页高用前缀和 O(1) 求得（flex 列容器里兄弟 margin 不塌陷，页高 = 末块底边 − 首块顶边）。
 * 屏数不预设：W_PAGE 是每屏的固定代价，屏数由「内容量 ÷ 每屏装多少」自然决定。
 * 硬约束：页高不超屏，且不跨过 `---`、手写分屏标记或 h1/h2 主题边界。
 * O(n²) 次转移，n = 全篇块数（典型 < 100），毫秒级以下。
 */
function dpPaginate(blocks: BlockList, usable: number): Page[] {
  const { atoms, hardAt } = blocks;
  const n = atoms.length;
  if (n === 0) return [];
  const limit = usable * (1 - DP_SLACK_RATIO);

  // 每个块「所属小节」：页首是标题就用它自己，否则用它前面最近的那个标题
  const secBefore: Array<{ section: string | null; level: number }> = [];
  let curSection: string | null = null;
  let curLevel = 0;
  for (let k = 0; k < n; k++) {
    secBefore.push({ section: curSection, level: curLevel });
    if (atoms[k].heading) {
      curSection = atoms[k].text.slice(0, 60);
      curLevel = atoms[k].level;
    }
  }

  // 语义边界：页 [j,i) 不得跨过它 ⇒ j 不能小于「i 之前最近的一个边界位置」
  const markerFloor = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    markerFloor[i] = hardAt.has(i - 1) ? i - 1 : markerFloor[i - 1];
  }
  const dp = new Array<number>(n + 1).fill(Infinity);
  const choice = new Array<number>(n + 1).fill(-1);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    // j 从 i-1 往前扩：页高单调增，一旦超限就没必要再往前
    for (let j = i - 1; j >= markerFloor[i]; j--) {
      // 硬限按「内容底边」算：末块的透明下边距溢出会被 overflow hidden 裁掉，不算问题
      const hContent = atoms[i - 1].contentBottom - atoms[j].top;
      const single = j === i - 1;
      // 单块自身就超屏时只能让它独占一屏，交给 syncVisibility 的等比缩放兜底
      if (hContent > limit && !single) break;
      if (dp[j] === Infinity) continue;
      const fill = (atoms[i - 1].bottom - atoms[j].top) / usable;
      const d = TARGET_FILL - fill;
      const cost =
        dp[j] + W_PAGE + W_SLACK * d * d + pagePenalty(atoms, j, i, usable);
      if (cost < dp[i]) {
        dp[i] = cost;
        choice[i] = j;
      }
    }
  }

  const ranges: Array<[number, number]> = [];
  for (let i = n; i > 0;) {
    const j = choice[i];
    ranges.push([j, i]);
    i = j;
  }
  ranges.reverse();

  return ranges.map(([j, i]) => {
    const sec = atoms[j].heading
      ? { section: atoms[j].text.slice(0, 60), level: atoms[j].level }
      : secBefore[j];
    return makePage(atoms.slice(j, i), sec.section, sec.level, usable);
  });
}

/** 代码块的行元素缓存（WeakMap：元素被卸载后自动回收） */
const lineCache = new WeakMap<HTMLElement, HTMLElement[]>();
function lineSpansOf(fig: HTMLElement): HTMLElement[] {
  let ls = lineCache.get(fig);
  if (!ls) {
    ls = Array.from(fig.querySelectorAll("span.line")) as HTMLElement[];
    lineCache.set(fig, ls);
  }
  return ls;
}

/**
 * 超屏的长代码块：按**行**拆到多屏，而不是把整块等比缩小。
 *
 * 等比缩小会让代码掉到 15px 上下（实测 21 行的块缩到 0.64 → 15.4px），
 * 后排直接看不清；真实课件遇到长代码也是「下一条继续」，不会缩成蚂蚁字。
 * 只能对「独占一屏的单块页」做——这类块的上下都没有别的块，拆开不影响上下文。
 *
 * 块高不是「行数 × 行高」：放映态代码是折行的，一个逻辑行可能占两行视觉高度，
 * 所以按每个行元素的**实测高度**做贪心装箱。
 */
function tableRowsOf(block: HTMLElement): HTMLElement[] {
  return Array.from(block.querySelectorAll<HTMLTableRowElement>("tbody > tr"));
}

function splitOversizeBlocks(pages: Page[], usable: number): Page[] {
  const out: Page[] = [];
  for (const page of pages) {
    const block = page.blocks.length === 1 ? page.blocks[0] : null;
    const isTable = page.kinds[0] === "table";
    // 跨行合并单元格不能安全切分，保留原表；普通 Markdown 表可按行拆分。
    const lines =
      block && page.kinds[0] === "code"
        ? lineSpansOf(block)
        : block && isTable && !block.querySelector("[rowspan]")
          ? tableRowsOf(block)
          : [];
    const naturalH = block ? pageNaturalH(page.blocks, marginBottomOfEl) : 0;
    if (!block || lines.length < 2 || naturalH <= usable) {
      out.push(page);
      continue;
    }
    // 代码块自身的固定开销（内边距、文件名条）不参与分页，从可用高里扣掉
    const chromeH = naturalH - lines.reduce((s, l) => s + l.offsetHeight, 0);
    const avail = usable - chromeH - 8;
    const heights = lines.map((l) => l.offsetHeight);
    const totalH = heights.reduce((s, v) => s + v, 0);
    // 第一遍贪心：求出「最少要几屏」
    const greedy: Array<{ range: [number, number]; h: number }> = [];
    {
      let from = 0;
      let h = 0;
      heights.forEach((lh, i) => {
        if (i > from && h + lh > avail) {
          greedy.push({ range: [from, i - 1], h });
          from = i;
          h = 0;
        }
        h += lh;
      });
      greedy.push({ range: [from, heights.length - 1], h });
    }
    // 第二遍均分：按 totalH / 屏数 重排。只按可用高贪心会切出
    // 「13 行 + 6 行」这种一屏很满一屏很空的续屏，均分后两屏都饱满。
    let chunks = greedy;
    if (greedy.length > 1) {
      const target = totalH / greedy.length;
      const even: typeof greedy = [];
      let from = 0;
      let h = 0;
      heights.forEach((lh, i) => {
        if (i > from && (h + lh > avail || h >= target)) {
          even.push({ range: [from, i - 1], h });
          from = i;
          h = 0;
        }
        h += lh;
      });
      even.push({ range: [from, heights.length - 1], h });
      // 均分可能多切出一屏（末屏过小），那还不如原来的贪心结果
      if (even.length <= greedy.length) chunks = even;
    }

    if (chunks.length < 2) {
      out.push(page);
      continue;
    }
    for (const { range, h: chunkH } of chunks) {
      out.push({
        ...page,
        ...(isTable ? { rows: range } : { lines: range }),
        naturalH: chromeH + chunkH,
        // 拆行页不参与放大：放大后折行会变、每屏的拆分点跟着漂，观感不稳定
        zoom: 1,
      });
    }
  }
  return out;
}

/** 页高的下边距取值（与 pageNaturalH 同口径） */
const marginBottomOfEl = (el: HTMLElement) =>
  parseFloat(getComputedStyle(el).marginBottom) || 0;

/**
 * 一页的实际高度。拆行页不能用 pageNaturalH——那量到的是**整块**的高度
 * （拆行范围只在「当前屏」生效，不在当前屏时所有行都是可见的），
 * 会把一屏 798px 的量成 1237px，既误报溢出又让居中失效。
 */
function pageHeight(page: Page, marginBottomOf: (el: HTMLElement) => number) {
  return page.naturalH ?? pageNaturalH(page.blocks, marginBottomOf);
}

/**
 * 整篇 → 分页结果。
 * 块在正常文档流内按原顺序排列，切页只是「显示/隐藏」范围变化，不移动任何节点。
 */
function paginate(container: HTMLElement): Page[] {
  // 重打包必须量完整表格/代码，不能把当前分片当成整块。
  container
    .querySelectorAll("[data-pr-row-hidden]")
    .forEach((row) => row.removeAttribute("data-pr-row-hidden"));
  container
    .querySelectorAll<HTMLElement>("figure.shiki span.line")
    .forEach((line) => line.style.removeProperty("display"));
  const usable = containerUsable(container);
  return splitOversizeBlocks(
    dpPaginate(collectBlocks(container), usable),
    usable,
  );
}

/** 目录条目：一节（h1/h2/h3 标题组）对应的放映屏区间 [start, end]，续屏并入同一条 */
type TocEntry = {
  label: string;
  level: number;
  /** 本节起始屏序号（index 单位：1 = 第一内容屏，0 = 标题页） */
  start: number;
  /** 本节最后一屏序号 */
  end: number;
};

interface PresenterOpenDetail {
  headingId?: string;
}

/** 从打包结果派生目录：section 变化处开新条目；无标题的前置块（section null）跳过 */
function buildTocEntries(pages: Page[]): TocEntry[] {
  const entries: TocEntry[] = [];
  pages.forEach((page, i) => {
    if (!page.section) return;
    const last = entries[entries.length - 1];
    if (last && last.label === page.section) last.end = i + 1;
    else {
      entries.push({
        label: page.section,
        level: page.level,
        start: i + 1,
        end: i + 1,
      });
    }
  });
  return entries;
}

export function Presenter({ title, description }: PresenterProps) {
  const [open, setOpen] = useState(false);
  const [jumpText, setJumpText] = useState("");
  // 0 = 章节标题页；i >= 1 对应 pages[i - 1]
  const [index, setIndex] = useState(0);
  // 每页已显示的块数（0 = 只显示首块）；切走再回来时保留
  const [revealed, setRevealed] = useState<Record<number, number>>({});
  const [isFullscreen, setFullscreen] = useState(false);
  // pagesRef 供 DOM/事件回调读取最新分页；state 供 React 渲染，避免 render 直接读取 ref。
  const [pages, setPages] = useState<Page[]>([]);
  // 目录浮层：鼠标移出后宽限 350ms 再收起（窄条命中易偏，宽限期内移回不闪断）
  const [tocOpen, setTocOpen] = useState(false);
  const tocCloseTimer = useRef<number | undefined>(undefined);
  const pagesRef = useRef<Page[]>([]);
  /** 重打包次数仅供演示审计记录。 */
  const packVerRef = useRef(0);
  const hrsRef = useRef<HTMLElement[]>([]);
  const layoutSigRef = useRef("");
  const indexRef = useRef(0);
  const revealedRef = useRef<Record<number, number>>({});
  const pendingHeadingIdRef = useRef<string | null>(null);
  const openerScrollYRef = useRef(0);
  const [readingHeadings, setReadingHeadings] = useState<HTMLElement[]>([]);

  useLayoutEffect(() => {
    indexRef.current = index;
    revealedRef.current = revealed;
  }, [index, revealed]);

  const openToc = useCallback(() => {
    if (tocCloseTimer.current !== undefined) {
      window.clearTimeout(tocCloseTimer.current);
      tocCloseTimer.current = undefined;
    }
    setTocOpen(true);
  }, []);

  const scheduleTocClose = useCallback(() => {
    if (tocCloseTimer.current !== undefined) {
      window.clearTimeout(tocCloseTimer.current);
    }
    tocCloseTimer.current = window.setTimeout(() => {
      tocCloseTimer.current = undefined;
      setTocOpen(false);
    }, 350);
  }, []);

  useEffect(
    () => () => {
      if (tocCloseTimer.current !== undefined)
        window.clearTimeout(tocCloseTimer.current);
    },
    [],
  );

  const openPresenter = useCallback((event?: Event) => {
    const el = document.getElementById("presenter-content");
    if (!el) return;
    const detail = (event as CustomEvent<PresenterOpenDetail> | undefined)
      ?.detail;
    pendingHeadingIdRef.current = detail?.headingId ?? null;
    openerScrollYRef.current = window.scrollY;
    setRevealed({});
    setIndex(0);
    setJumpText("");
    // 重新打开演示时清空「上次可见」记录，让第一屏的内容照常播到达动效
    prevVisibleBlocks = new Set();
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    const currentIndex = indexRef.current;
    const returnTarget =
      currentIndex > 0 ? pagesRef.current[currentIndex - 1]?.blocks[0] : null;
    const openerScrollY = openerScrollYRef.current;
    const leaveFullscreen = document.fullscreenElement
      ? document.exitFullscreen().catch(() => {})
      : Promise.resolve();

    setOpen(false);
    void leaveFullscreen.finally(() => {
      // 等 presenting 清理完成、正文块恢复正常文档流后再定位，否则隐藏属性仍会让坐标失真。
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (returnTarget?.isConnected) {
            returnTarget.scrollIntoView({ block: "start", behavior: "auto" });
            window.scrollBy({ top: -80, behavior: "auto" });
          } else {
            window.scrollTo({ top: openerScrollY, behavior: "auto" });
          }
        });
      });
    });
  }, []);

  useEffect(() => {
    const content = document.getElementById("presenter-content");
    if (!content) return;
    // 标题来自同页 MDX 渲染后的外部 DOM；挂载后收集一次，供 portal 放置局部演示入口。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadingHeadings(
      Array.from(
        content.querySelectorAll<HTMLElement>(
          ":scope > h1, :scope > h2, :scope > h3",
        ),
      ),
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoOpenTimer =
      params.get("present") === "1"
        ? window.setTimeout(openPresenter, 0)
        : undefined;
    window.addEventListener(PRESENTER_OPEN_EVENT, openPresenter);
    return () => {
      if (autoOpenTimer !== undefined) window.clearTimeout(autoOpenTimer);
      window.removeEventListener(PRESENTER_OPEN_EVENT, openPresenter);
    };
  }, [openPresenter]);

  // 进入：加 presenting 类（容器变为全屏放映尺寸）后立即按该宽度打包分页；
  // 退出：清理隐藏标记与缩放、退出全屏、解锁文档
  useLayoutEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("presenting");
    const el = document.getElementById("presenter-content");
    if (el) {
      // 先隐藏顶层 --- 分隔线再测量打包（它不属于任何页，放映全程隐藏）
      hrsRef.current = (Array.from(el.children) as HTMLElement[]).filter(
        (c) => c.tagName === "HR",
      );
      hrsRef.current.forEach((h) => h.setAttribute("data-pr-hidden", ""));
      const nextPages = paginate(el);
      pagesRef.current = nextPages;
      const requestedHeading = pendingHeadingIdRef.current
        ? document.getElementById(pendingHeadingIdRef.current)
        : null;
      const requestedPage = requestedHeading
        ? nextPages.findIndex((page) =>
            page.blocks.includes(requestedHeading),
          ) + 1
        : 0;
      const initialIndex = requestedPage > 0 ? requestedPage : 0;
      pendingHeadingIdRef.current = null;
      indexRef.current = initialIndex;
      layoutSigRef.current = "";
      packVerRef.current += 1;
      // DOM 测量结果只能在 presenting 样式生效后的 layout effect 中取得。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPages(nextPages);
      setIndex(initialIndex);
      publishDebug(el, pagesRef.current, initialIndex, packVerRef.current);
    }
    return () => {
      root.classList.remove("presenting");
      document
        .querySelectorAll("[data-pr-hidden]")
        .forEach((el) => el.removeAttribute("data-pr-hidden"));
      document
        .querySelectorAll("[data-pr-row-hidden]")
        .forEach((row) => row.removeAttribute("data-pr-row-hidden"));
      document.querySelectorAll("[data-pr-kind]").forEach((el) => {
        el.removeAttribute("data-pr-kind");
        (el as HTMLElement).style.removeProperty("--pr-fit");
      });
      // 长代码块拆行留下的行内 display / 计数器重置 与「续」标记
      document
        .querySelectorAll("#presenter-content figure.shiki span.line")
        .forEach((el) => {
          const line = el as HTMLElement;
          line.style.removeProperty("display");
          line.removeAttribute("data-pr-lineno");
        });
      document
        .querySelectorAll("[data-pr-cont]")
        .forEach((el) => el.removeAttribute("data-pr-cont"));
      document
        .querySelectorAll("[data-pr-fresh]")
        .forEach((el) => el.removeAttribute("data-pr-fresh"));
      prevVisibleBlocks = new Set();
      document.querySelectorAll("[data-pr-oversized]").forEach((el) => {
        el.removeAttribute("data-pr-oversized");
        (el as HTMLElement).style.removeProperty("--pr-scale");
        (el as HTMLElement).style.removeProperty("--pr-mt");
      });
      const content = document.getElementById("presenter-content");
      content?.style.removeProperty("--pr-zoom");
      content?.style.removeProperty("transform");
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [open]);

  // 布局变化后重打包（事件驱动，不做固定周期轮询——周期性重测会把任何测量
  // 误差放大成「规律抽动」）。触发源：容器尺寸变化（窗口缩放/进退出全屏，
  // 用 ResizeObserver 盯 fixed 容器）、字体就绪、以及打开后 1.2s 的延迟兜底。
  // 测量必须基于「所有块同时可见」的完整布局（隐藏块 offset 为 0 会导致打包
  // 失真），因此先同步摘除全部隐藏标记，测完立即恢复——同一 JS 任务内完成，不闪屏。
  useEffect(() => {
    if (!open) return;
    let debounce: number | undefined;
    const repack = () => {
      const el = document.getElementById("presenter-content");
      if (!el) return;
      // 测量须在基准字号（zoom=1）下进行，避免上一页的放大字号使分页漂移
      el.style.setProperty("--pr-zoom", "1");
      const blocks = (Array.from(el.children) as HTMLElement[]).filter(
        (c) => c.tagName !== "HR" && !c.hasAttribute("data-presenter-break"),
      );
      blocks.forEach((b) => b.removeAttribute("data-pr-hidden"));
      const pages = paginate(el);
      const sig = blocks
        .map((b) => `${b.offsetWidth}x${renderedHeightOf(b)}:${b.scrollWidth}`)
        .join("|");
      if (sig !== layoutSigRef.current) {
        layoutSigRef.current = sig;
        pagesRef.current = pages;
        setIndex((i) => Math.min(i, pages.length));
        packVerRef.current += 1;
        setPages(pages);
      }
      // 同一任务内立即恢复当前页状态，避免整篇内容闪现。
      // 先落字号与居中（transform 不碰布局），再同步显隐。
      const idx = Math.min(indexRef.current, pages.length);
      applyPageZoom(el, idx === 0 ? undefined : pages[idx - 1]);
      syncVisibility(
        el,
        pages,
        hrsRef.current,
        idx,
        revealedRef.current,
        false,
      );
      publishDebug(el, pages, idx, packVerRef.current);
    };
    const schedule = () => {
      if (debounce !== undefined) window.clearTimeout(debounce);
      debounce = window.setTimeout(repack, 250);
    };
    const el = document.getElementById("presenter-content");
    const ro = el
      ? new ResizeObserver((entries) => {
          // 隐藏块在重打包时会短暂变为可见；只响应容器或最终仍可见块的尺寸变化，
          // 避免「摘隐藏标记 → observer → 重打包」自激循环。
          if (
            entries.some(
              (entry) =>
                entry.target === el ||
                !(entry.target as HTMLElement).hasAttribute("data-pr-hidden"),
            )
          ) {
            schedule();
          }
        })
      : null;
    if (el && ro) {
      ro.observe(el);
      Array.from(el.children).forEach((child) => {
        if (
          child instanceof HTMLElement &&
          child.tagName !== "HR" &&
          !child.hasAttribute("data-presenter-break")
        ) {
          ro.observe(child);
        }
      });
    }
    const settle = window.setTimeout(repack, 1200);
    document.fonts?.ready?.then(schedule).catch(() => {});
    return () => {
      if (debounce !== undefined) window.clearTimeout(debounce);
      window.clearTimeout(settle);
      ro?.disconnect();
    };
  }, [open]);

  // 可见性同步：只显示「当前页 + 已揭示块」；当前页为超高单块时做缩放适配
  useLayoutEffect(() => {
    if (!open) return;
    const el = document.getElementById("presenter-content");
    if (!el) return;
    // 先落字号与居中（transform 不碰布局，也不污染重打包测量），再同步显隐
    applyPageZoom(el, index === 0 ? undefined : pagesRef.current[index - 1]);
    syncVisibility(el, pagesRef.current, hrsRef.current, index, revealed);
    publishDebug(el, pagesRef.current, index, packVerRef.current);
  }, [open, index, revealed]);

  const next = useCallback(() => {
    if (pages.length === 0) return;
    if (index === 0) {
      setIndex(1);
      return;
    }
    const k = revealed[index] ?? 0;
    const page = pages[index - 1];
    if (page && k < page.blocks.length - 1) {
      setRevealed((r) => ({ ...r, [index]: k + 1 }));
    } else if (index < pages.length) {
      setIndex(index + 1);
    }
  }, [index, pages, revealed]);

  const prev = useCallback(() => {
    if (index === 0) return;
    const k = revealed[index] ?? 0;
    if (k > 0) {
      setRevealed((r) => ({ ...r, [index]: k - 1 }));
    } else {
      setIndex(index - 1);
    }
  }, [index, revealed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          // Monaco 新版走 EditContext：聚焦的是 div.native-edit-context（role="textbox"），
          // 既不是 textarea 也不是 contentEditable，只看 tagName 会让空格/方向键被当成翻屏
          target.closest(".monaco-editor"))
      ) {
        return;
      }
      const key = e.key;
      // 空格/回车落在本演示框架的按钮上时交给按钮默认激活（一次按键只翻一屏），
      // 避免与全局翻页重复触发导致一次跳两屏
      if (
        (key === " " || key === "Enter") &&
        target?.tagName === "BUTTON" &&
        target.closest(".presenter-overlay")
      ) {
        return;
      }
      if (key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else close();
      } else if (key === "ArrowRight" || key === " " || key === "PageDown") {
        e.preventDefault();
        next();
      } else if (key === "ArrowLeft" || key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (key === "Home") {
        e.preventDefault();
        setIndex(1);
      } else if (key === "End") {
        e.preventDefault();
        setIndex(pages.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, close, pages.length]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  const total = pages.length + 1;
  const page = pages[index - 1];
  const k = page ? Math.min(revealed[index] ?? 0, page.blocks.length - 1) : 0;
  const revealing = index > 0 && page && k < page.blocks.length - 1;
  const tocEntries = buildTocEntries(pages);

  const navBtn = (extra?: string) =>
    buttonVariants({
      color: "ghost",
      size: "sm",
      className: `gap-1.5 [&_svg]:size-4 ${extra ?? ""}`,
    });

  return (
    <>
      {!open &&
        readingHeadings.map((heading) => {
          const headingLabel =
            heading.querySelector(":scope > a")?.textContent?.trim() ||
            heading.id ||
            "此标题";
          return createPortal(
            <button
              key={heading.id}
              type="button"
              className="presenter-heading-trigger"
              aria-label={`从“${headingLabel}”开始演示`}
              title="从此标题开始演示"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent<PresenterOpenDetail>(PRESENTER_OPEN_EVENT, {
                    detail: { headingId: heading.id },
                  }),
                )
              }
            >
              <Presentation aria-hidden="true" />
              <span>从此演示</span>
            </button>,
            heading,
          );
        })}
      {open && (
        <div className="presenter-overlay" role="dialog" aria-label="逐屏演示">
          {/* 顶栏：左＝课名（安静）+ 当前小节（抬头，每屏都给「现在讲到哪」的上下文），
            右＝页码（等宽数字，翻页时不跳）。进度条压在顶栏下沿，替代原来的文字分数。 */}
          <header className="presenter-topbar">
            <span className="presenter-topbar-title">
              <span className="presenter-topbar-lesson">
                课堂讲解 · {title}
              </span>
              {/* 课名与 h1 常常同名（讲义开头都会再写一遍标题），同名时不重复显示 */}
              {index > 0 &&
                page?.section &&
                page.section !== title &&
                !page.blocks.some(
                  (block) =>
                    isHeading(block) &&
                    block.textContent?.trim() === page.section,
                ) && (
                  <>
                    <span
                      className="presenter-topbar-rule"
                      aria-hidden="true"
                    />
                    <span
                      className="presenter-topbar-section"
                      title={page.section}
                    >
                      {page.section}
                    </span>
                  </>
                )}
            </span>
            <span className="presenter-topbar-counter">
              {page?.rows && (
                <span className="presenter-chip">
                  第 {page.rows[0] + 1}–{page.rows[1] + 1} 行
                </span>
              )}
              {revealing && (
                <span className="presenter-chip">
                  本屏 {k + 1}/{page!.blocks.length} 段
                </span>
              )}
              <span className="presenter-pagecount">
                {index + 1}
                <span className="presenter-pagecount-sep">/</span>
                {total}
              </span>
            </span>
          </header>
          <div className="presenter-progress" aria-hidden="true">
            <span
              style={{
                transform: `scaleX(${total > 1 ? index / (total - 1) : 1})`,
              }}
            />
          </div>

          {/* 恒渲染的占位区：把底栏钉在底部（不可卸载，否则 footer 会顶到顶栏下） */}
          <main className="presenter-stage">
            {index === 0 && (
              <section className="presenter-titlepage">
                <span className="presenter-titlepage-mark" aria-hidden="true" />
                <h1 className="presenter-titlepage-title">{title}</h1>
                {description ? (
                  <p className="presenter-titlepage-desc">{description}</p>
                ) : null}
                <p className="presenter-titlepage-hint">
                  按 → 或空格键开始（共 {total} 屏）
                </p>
              </section>
            )}
          </main>

          <footer className="presenter-bottombar">
            <span className="presenter-bottombar-hint">
              ←/→ 逐段显示并翻屏 · Home/End 首尾 · Esc 退出
            </span>
            <span className="presenter-jump">
              <span className="presenter-jump-label">跳至</span>
              <input
                aria-label="跳转到指定屏"
                inputMode="numeric"
                pattern="[0-9]*"
                value={jumpText}
                onChange={(e) =>
                  setJumpText(e.target.value.replace(/[^0-9]/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(jumpText, 10);
                    if (!Number.isNaN(n)) {
                      setIndex(Math.min(Math.max(n, 1), total) - 1);
                    }
                    setJumpText("");
                  } else if (e.key === "Escape") {
                    setJumpText("");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder={String(index + 1)}
                className="presenter-jump-input"
              />
              <span className="presenter-jump-total">/ {total}</span>
            </span>
            <span className="presenter-bottombar-actions">
              {revealing && (
                <button
                  type="button"
                  className={navBtn()}
                  onClick={() =>
                    setRevealed((prev) => ({
                      ...prev,
                      [index]: page.blocks.length - 1,
                    }))
                  }
                >
                  显示本屏
                </button>
              )}
              <button type="button" onClick={prev} className={navBtn()}>
                <ChevronLeft />
                上一屏
              </button>
              <button type="button" onClick={next} className={navBtn()}>
                {revealing ? "展开下一步" : "下一屏"}
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={navBtn()}
                aria-label={isFullscreen ? "退出全屏" : "全屏"}
                title={isFullscreen ? "退出全屏" : "全屏"}
              >
                {isFullscreen ? <Minimize /> : <Maximize />}
              </button>
              <button
                type="button"
                onClick={close}
                className={navBtn("text-fd-error [&_svg]:text-fd-error")}
                aria-label="退出演示"
                title="退出演示（Esc）"
              >
                <X />
              </button>
            </span>
          </footer>
        </div>
      )}
      {/* 目录浮层：右缘 30px 命中带悬停展开、移走延迟 350ms 收缩；点击条目跳屏；老师专用 */}
      {open && (
        <div
          className={`presenter-toc-rail${tocOpen ? " is-open" : ""}`}
          aria-hidden={tocEntries.length === 0}
          aria-label="本节目录：悬停展开，点击跳转"
          onMouseEnter={openToc}
          onMouseLeave={scheduleTocClose}
        >
          <ListTree className="presenter-toc-rail-icon" aria-hidden="true" />
          <nav className="presenter-toc-panel" aria-label="本节目录">
            <div className="presenter-toc-head">目录</div>
            {tocEntries.map((e) => (
              <button
                key={e.start}
                type="button"
                className="presenter-toc-item"
                title={e.label}
                data-level={e.level}
                data-active={
                  index >= e.start && index <= e.end ? "true" : undefined
                }
                onClick={() => setIndex(e.start)}
              >
                {e.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
