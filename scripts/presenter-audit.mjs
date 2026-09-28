#!/usr/bin/env node
/**
 * 逐屏演示（presenter）分页审计：逐课在双视口下跑一遍放映，量化
 * 「碎屏率 / 溢出 / 字号达标 / 段边界闭合 / 重打包抖动」。
 *
 * 用法（在项目根目录）：
 *   node scripts/presenter-audit.mjs                     # 全部课 × 1080p + 4K
 *   node scripts/presenter-audit.mjs --only loop         # 只跑 slug 含 "loop" 的课
 *   node scripts/presenter-audit.mjs --once              # 只用 1080p（快速迭代）
 *   node scripts/presenter-audit.mjs --strict            # 字号/碎屏也作为失败项（退出码非 0）
 *   node scripts/presenter-audit.mjs --json report.json  # 存原始报告
 *   BASE=http://127.0.0.1:3000 node scripts/presenter-audit.mjs
 *
 * 前置：本地静态文件服务器，或 next dev。
 * 数据源：presenter.tsx 在 ?prdebug=1 下把分页结果发布到 window.__PR_DEBUG。
 *
 * 阈值（以视口高度百分比表达，1080p 与 4K 用同一把尺子）：
 *   · 正文 ≥ 2.7vh（1080p ≈ 29px，目标 24pt/32px）
 *   · 代码 ≥ 2.0vh（1080p ≈ 22px）
 *   · 横向/纵向溢出 ≤ 4px；屏内不得出现段边界（HR / h1-h2 / 分屏标记必须闭合一屏）
 *   · 稀疏屏（填充 < 35%）占比 = 主要观感指标，碎屏 = 稀疏且非刻意断屏
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content/docs");

/** 稀疏屏阈值（填充率低于此值即认为「内容装不满一屏」） */
const SPARSE_RATIO = 0.35;
/** 字号下限，单位 vh */
const MIN_BODY_VH = 2.7;
const MIN_CODE_VH = 2.0;
/** 溢出容忍（取整误差） */
const MAX_OVERFLOW_PX = 4;
/** 一次放映允许的重打包次数（字体就绪 + resize 兜底，正常 ≤2） */
const MAX_PACK_CHURN = 3;

const args = process.argv.slice(2);
const flagOf = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : def;
};
const only = flagOf("--only", null);
const base = process.env.BASE ?? flagOf("--base", "http://127.0.0.1:3002");
const jsonOut = flagOf("--json", null);
const strict = args.includes("--strict");
const once = args.includes("--once");

const VIEWPORTS = [
  { name: "1080p", w: 1920, h: 1080 },
  ...(once ? [] : [{ name: "4K", w: 3840, h: 2160 }]),
];

/** 枚举 content/docs 下的课程页（排除 index.mdx 与隐藏课外的落地页） */
function listLessons() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith(".mdx") || name === "index.mdx") continue;
      const slug = relative(contentDir, full).replace(/\.mdx$/, "");
      if (only && !slug.includes(only)) continue;
      out.push({ slug, url: `/docs/${slug}` });
    }
  };
  if (!existsSync(contentDir)) {
    console.error(`✖ 找不到内容目录：${contentDir}`);
    process.exit(1);
  }
  walk(contentDir);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** 等分页稳定：packVer 连续若干轮不变（字体就绪 / 1.2s 兜底都会触发重打包） */
async function waitStable(page) {
  await page.waitForFunction(() => window.__PR_DEBUG?.pages?.length > 0, null, {
    timeout: 30000,
  });
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 50; i++) {
    const v = await page.evaluate(() => window.__PR_DEBUG?.packVer ?? -1);
    if (v === last && v >= 0) {
      stable += 1;
      if (stable >= 5) return v;
    } else {
      stable = 0;
    }
    last = v;
    await page.waitForTimeout(200);
  }
  return last;
}

/**
 * 量每屏的实际字号。逐屏把 --pr-zoom 调到该屏的值再读 computed style
 * （--pr-zoom 只影响绘制，不触发重打包），因此不必真的逐屏翻页。
 */
async function measureFonts(page) {
  return page.evaluate(() => {
    const el = document.getElementById("presenter-content");
    const tops = Array.from(el.children).filter((c) => c.tagName !== "HR");
    document
      .querySelectorAll("[data-pr-hidden]")
      .forEach((e) => e.removeAttribute("data-pr-hidden"));
    const visible = (n) => n.getClientRects().length > 0;
    // 零宽字符不算文字：KaTeX 内部有大量 1px 的 .vlist-s 定位占位元素（内容只有 U+200B）
    const hasText = (s) => /[^\s​-‏﻿]/.test(s);
    const hasOwnText = (n) =>
      Array.from(n.childNodes).some(
        (c) => c.nodeType === 3 && hasText(c.textContent),
      );
    const out = [];
    for (const p of window.__PR_DEBUG.pages) {
      el.style.setProperty("--pr-zoom", String(p.zoom || 1));
      let bodyPx = null;
      let codePx = null;
      let minTextPx = null;
      p.blockIdx.forEach((idx, k) => {
        const b = tops[idx];
        if (!b) return;
        const kind = p.kinds[k];
        const own = parseFloat(getComputedStyle(b).fontSize);
        if (
          bodyPx === null &&
          (kind === "text" || kind === "other" || kind === "formula")
        ) {
          bodyPx = own;
        }
        if (kind === "code") {
          const c = b.querySelector("pre code") || b.querySelector("pre");
          if (c) {
            const fs = parseFloat(getComputedStyle(c).fontSize);
            codePx = codePx === null ? fs : Math.min(codePx, fs);
          }
        }
        // 「屏上最小的字」：含交互/卡片类块才细查（这些组件内部是固定字号，最易变小）
        if (kind !== "text" && kind !== "heading") {
          for (const n of [b, ...b.querySelectorAll("*")]) {
            if (n.tagName === "SVG" || n.closest("svg")) continue;
            if (!visible(n) || !hasOwnText(n)) continue;
            const fs = parseFloat(getComputedStyle(n).fontSize);
            if (!fs) continue;
            minTextPx = minTextPx === null ? fs : Math.min(minTextPx, fs);
          }
        }
      });
      out.push({ n: p.n, zoom: p.zoom, bodyPx, codePx, minTextPx });
    }
    return { pages: out, vh: window.innerHeight / 100 };
  });
}

function analyze(debug, fonts) {
  const { pages, vh } = fonts;
  const byN = new Map(pages.map((p) => [p.n, p]));
  let overflow = 0;
  let oversize = 0;
  let sparse = 0;
  let fragments = 0;
  let boundaryInside = 0;
  let badBody = 0;
  let badCode = 0;
  let hrCrossed = 0;
  let minBody = Infinity;
  let minCode = Infinity;
  let minAny = Infinity;
  const worst = [];
  const overflowPages = [];

  for (const p of debug.pages) {
    const f = byN.get(p.n) ?? {};
    if (
      p.overflowPx > MAX_OVERFLOW_PX ||
      (p.overflowXPx ?? 0) > MAX_OVERFLOW_PX
    ) {
      overflow += 1;
      overflowPages.push({
        n: p.n,
        y: p.overflowPx,
        x: p.overflowXPx ?? 0,
        kinds: p.kinds.join(","),
        preview: p.preview,
      });
    }
    if (p.oversize) oversize += 1;
    if (p.boundaryInside) boundaryInside += 1;
    hrCrossed += p.hrCrossed ?? 0;
    if (p.fillRatio < SPARSE_RATIO) {
      sparse += 1;
      // 刻意断屏（HR/标题/标记之后）不算碎屏——那是作者要求的
      if (p.breakBefore === "none") {
        fragments += 1;
        worst.push({
          n: p.n,
          fill: p.fillRatio,
          blocks: p.blocks,
          textLen: p.textLen,
          kinds: p.kinds.join(","),
          section: p.section,
          preview: p.preview,
        });
      }
    }
    if (f.bodyPx != null) {
      minBody = Math.min(minBody, f.bodyPx);
      if (f.bodyPx < MIN_BODY_VH * vh) badBody += 1;
    }
    if (f.codePx != null) {
      minCode = Math.min(minCode, f.codePx);
      if (f.codePx < MIN_CODE_VH * vh) badCode += 1;
    }
    if (f.minTextPx != null) minAny = Math.min(minAny, f.minTextPx);
  }
  const finite = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
  return {
    total: debug.pages.length,
    overflow,
    oversize,
    sparse,
    fragments,
    boundaryInside,
    hrCrossed,
    badBody,
    badCode,
    minBody: finite(minBody),
    minCode: finite(minCode),
    minAny: finite(minAny),
    packVer: debug.packVer,
    overflowPages,
    worst: worst.sort((a, b) => a.fill - b.fill).slice(0, 5),
  };
}

/** 阅读态回归：不带 ?present=1 打开，确认放映态痕迹已清干净 */
async function checkReadingMode(page, url) {
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  return page.evaluate(() => ({
    presenting: document.documentElement.classList.contains("presenting"),
    hidden: document.querySelectorAll("[data-pr-hidden]").length,
    oversized: document.querySelectorAll("[data-pr-oversized]").length,
    overlay: document.querySelectorAll(".presenter-overlay").length,
  }));
}

/**
 * 优先用 playwright 自带的 chromium；未下载（离线/代理受阻）时回退系统 Chrome。
 * 可用 PR_CHANNEL=chrome|chromium|msedge 强制指定。
 */
async function launchBrowser() {
  const forced = process.env.PR_CHANNEL;
  if (forced) return chromium.launch({ channel: forced });
  try {
    return await chromium.launch();
  } catch (err) {
    if (!/Executable doesn't exist/.test(err.message)) throw err;
    console.warn(
      "· 未找到 playwright 自带 chromium，回退系统 Chrome（如需自带：pnpm exec playwright install chromium）",
    );
    return chromium.launch({ channel: "chrome" });
  }
}

async function main() {
  const lessons = listLessons();
  if (!lessons.length) {
    console.error("✖ 没有匹配的课程（--only 过滤后为空）");
    process.exit(1);
  }
  const browser = await launchBrowser();
  const report = [];
  const failures = [];

  console.log(
    `审计 ${lessons.length} 节课 × ${VIEWPORTS.length} 个视口，服务器 ${base}\n`,
  );
  const header = [
    "课程",
    "视口",
    "屏数",
    "碎屏",
    "稀疏",
    "溢出",
    "缩放兜底",
    "边界内切",
    "正文px",
    "代码px",
    "最小px",
    "重打包",
  ];
  const widths = [34, 6, 5, 5, 5, 5, 8, 8, 7, 7, 7, 7];
  const fmtRow = (cells) =>
    cells.map((c, i) => String(c).padEnd(widths[i])).join(" ");
  console.log(fmtRow(header));
  console.log("-".repeat(widths.reduce((a, b) => a + b + 1, 0)));

  for (const lesson of lessons) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      let row;
      try {
        await page.goto(`${base}${lesson.url}?present=1&prdebug=1`, {
          waitUntil: "domcontentloaded",
        });
        const packVer = await waitStable(page);
        const debug = await page.evaluate(() => window.__PR_DEBUG);
        const fonts = await measureFonts(page);
        const m = analyze(debug, fonts);
        // 阅读态回归每课只查一次（与视口无关），省掉一半页面加载
        const reading =
          vp === VIEWPORTS[0]
            ? await checkReadingMode(page, lesson.url)
            : { skipped: true };
        const readingBad =
          reading.presenting ||
          reading.hidden ||
          reading.oversized ||
          reading.overlay;

        row = { slug: lesson.slug, viewport: vp.name, ...m, reading, packVer };
        report.push(row);

        if (m.overflow > 0) {
          const detail = m.overflowPages
            .map((p) => `屏${p.n}(横${p.x}px/纵${p.y}px ${p.kinds})`)
            .join("、");
          failures.push(
            `${lesson.slug} [${vp.name}] ${m.overflow} 屏溢出：${detail}`,
          );
        }
        if (m.boundaryInside > 0)
          failures.push(
            `${lesson.slug} [${vp.name}] ${m.boundaryInside} 屏内有段边界未闭合`,
          );
        if (packVer > MAX_PACK_CHURN)
          failures.push(
            `${lesson.slug} [${vp.name}] 重打包 ${packVer} 次（抖动）`,
          );
        if (readingBad)
          failures.push(
            `${lesson.slug} 阅读态残留：${JSON.stringify(reading)}`,
          );
        if (strict && m.badBody > 0)
          failures.push(
            `${lesson.slug} [${vp.name}] ${m.badBody} 屏正文 < ${MIN_BODY_VH}vh`,
          );
        if (strict && m.badCode > 0)
          failures.push(
            `${lesson.slug} [${vp.name}] ${m.badCode} 屏代码 < ${MIN_CODE_VH}vh`,
          );
        if (strict && m.fragments > 0)
          failures.push(`${lesson.slug} [${vp.name}] ${m.fragments} 个碎屏`);

        const flag = m.overflow || m.boundaryInside ? " ⚠" : "";
        void flag;
        console.log(
          fmtRow([
            lesson.slug,
            vp.name,
            m.total,
            `${m.fragments}`,
            `${m.sparse}`,
            `${m.overflow}`,
            `${m.oversize}`,
            `${m.boundaryInside}`,
            m.minBody ?? "-",
            m.minCode ?? "-",
            m.minAny ?? "-",
            packVer,
          ]),
        );
      } catch (err) {
        console.log(
          fmtRow([
            lesson.slug,
            vp.name,
            `ERROR: ${err.message.split("\n")[0].slice(0, 60)}`,
          ]),
        );
        failures.push(
          `${lesson.slug} [${vp.name}] 运行失败：${err.message.split("\n")[0]}`,
        );
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  // 汇总
  const agg = report.reduce(
    (a, r) => {
      a.pages += r.total;
      a.sparse += r.sparse;
      a.fragments += r.fragments;
      a.overflow += r.overflow;
      a.oversize += r.oversize;
      a.boundaryInside += r.boundaryInside;
      a.hrCrossed += r.hrCrossed;
      return a;
    },
    {
      pages: 0,
      sparse: 0,
      fragments: 0,
      overflow: 0,
      oversize: 0,
      boundaryInside: 0,
      hrCrossed: 0,
    },
  );
  const pct = (x) => (agg.pages ? ((x / agg.pages) * 100).toFixed(1) : "0.0");
  console.log(
    `\n合计 ${agg.pages} 屏：稀疏 ${agg.sparse}（${pct(agg.sparse)}%）、碎屏 ${agg.fragments}（${pct(agg.fragments)}%）、` +
      `溢出 ${agg.overflow}、缩放兜底 ${agg.oversize}、语义边界未闭合 ${agg.boundaryInside}、` +
      `跨过 --- ${agg.hrCrossed}`,
  );

  // 最稀疏的几屏（碎屏排查入口）
  const worst = report
    .flatMap((r) =>
      r.worst.map((w) => ({ ...w, slug: r.slug, vp: r.viewport })),
    )
    .sort((a, b) => a.fill - b.fill)
    .slice(0, 10);
  if (worst.length) {
    console.log("\n最稀疏的 10 屏（填充率 / 块数 / 字数 / 类型）：");
    for (const w of worst) {
      console.log(
        `  ${w.slug} [${w.vp}] 屏${w.n}  ${(w.fill * 100).toFixed(0)}%  ${w.blocks}块 ${w.textLen}字  ${w.kinds}` +
          `${w.preview ? `  ${w.preview}` : ""}`,
      );
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ base, agg, report }, null, 2));
    console.log(`\n原始报告已写入 ${jsonOut}`);
  }

  if (failures.length) {
    console.log(`\n✖ ${failures.length} 项失败：`);
    for (const f of failures.slice(0, 30)) console.log(`  · ${f}`);
    if (failures.length > 30)
      console.log(`  … 另有 ${failures.length - 30} 项`);
    process.exit(1);
  }
  console.log("\n✔ 全部通过");
}

main().catch((err) => {
  console.error("✖ 审计脚本异常：", err);
  process.exit(1);
});
