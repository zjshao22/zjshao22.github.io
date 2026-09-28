/**
 * AI 里程碑时间线：左侧年份轴 + 事件卡片，支持「阶段」分组行与
 * 「类型」彩色标签（学派/成就/应用/转折）。
 * 纯静态组件（无 'use client'），fd-* 令牌配色，自动适配浅/深主题。
 *
 * 结构：事件行（年份｜轴点｜卡片）与阶段行（轴点｜阶段徽章）交替排列，
 * 每条都是独立行；竖轴由每一行内部的线段首尾相接而成（最后一行不画线，
 * 避免出现拖尾）。阶段行本身也是一颗轴点，保证轴线不断开。
 *
 * 放映模式约束：本组件是不可分割的顶层块。所在标题组建议只放
 * 「h3 小标题 + 一句引导 + 本组件」；单实例 ≤ 7 行，保证投影
 * （约 768px 高）下单屏可读，避免被放映器底部裁切。
 */

export interface AiTimelineItem {
  /** 年份或年代区间，如 '1956'、'1980s' */
  year: string;
  /** 事件名称，如 '达特茅斯会议' */
  event: string;
  /** 一句话补充说明（可省略） */
  note?: string;
  /** 类型标签：学派 / 成就 / 应用 / 转折 */
  kind?: "research" | "achievement" | "application" | "turning";
  /** 阶段分组名：与上一条不同时，自动插入一行阶段徽章 */
  era?: string;
}

const KIND_META: Record<
  NonNullable<AiTimelineItem["kind"]>,
  { label: string; cls: string }
> = {
  research: {
    label: "学派",
    cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  achievement: {
    label: "成就",
    cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  application: {
    label: "应用",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  turning: {
    label: "转折",
    cls: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
};

/** 年份列宽（w-14）→ 轴心 x 固定，竖线与圆点共用同一坐标 */
const AXIS_CLS = "left-[71px]";

export default function AiTimeline({ items }: { items: AiTimelineItem[] }) {
  const rows: (AiTimelineItem & { isEra: boolean; isLast: boolean })[] = [];
  items.forEach((item, i) => {
    const isNewEra = Boolean(item.era) && item.era !== items[i - 1]?.era;
    if (isNewEra) {
      rows.push({ ...item, isEra: true, isLast: false });
    }
    rows.push({ ...item, isEra: false, isLast: i === items.length - 1 });
  });

  return (
    <div className="my-6" role="list" aria-label="人工智能里程碑时间线">
      {rows.map((row, i) => {
        const kind = row.isEra ? null : row.kind ? KIND_META[row.kind] : null;
        return (
          <div key={i} role="listitem" className="relative pb-4 last:pb-0">
            {/* 竖轴线段：每行含下边距，首尾相接成一条连续轴线（最后一行不画，避免拖尾） */}
            {!row.isLast && (
              <div
                aria-hidden
                className={`absolute inset-y-0 w-px bg-fd-border ${AXIS_CLS}`}
              />
            )}
            {row.isEra ? (
              /* 阶段行：独立轴点 + 阶段徽章，让轴线不断开 */
              <div className="flex items-start gap-2">
                <div className="w-14 shrink-0" />
                <div className="flex w-4 shrink-0 justify-center">
                  <span className="mt-[7px] size-2.5 shrink-0 rounded-full border-2 border-fd-primary bg-fd-background" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-muted px-3 py-1 text-xs font-medium leading-none text-fd-muted-foreground">
                  {row.era}
                </div>
              </div>
            ) : (
              /* 事件行：年份 ｜ 轴点 ｜ 卡片 */
              <div className="flex items-start gap-2">
                <div className="w-14 shrink-0 pt-4 text-right font-mono text-sm font-semibold leading-none text-fd-primary">
                  {row.year}
                </div>
                <div className="flex w-4 shrink-0 justify-center">
                  <span className="mt-[19px] size-2.5 shrink-0 rounded-full border-2 border-fd-primary bg-fd-background" />
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-fd-border bg-fd-card/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold leading-snug">
                      {row.event}
                    </span>
                    {kind && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium leading-none ${kind.cls}`}
                      >
                        {kind.label}
                      </span>
                    )}
                  </div>
                  {row.note && (
                    <div className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                      {row.note}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
