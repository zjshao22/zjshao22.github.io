export interface KeyPointItem {
  /** 大字要点 */
  title: string;
  /** 补充说明 */
  desc?: string;
}

export default function KeyPoints({ items }: { items: KeyPointItem[] }) {
  return (
    <div className="my-8 grid gap-5 md:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="relative rounded-2xl border-2 border-fd-primary/25 bg-fd-card/70 p-5 pt-8"
        >
          <span className="absolute -top-3.5 left-4 rounded-full bg-fd-primary px-3.5 py-1 text-sm font-semibold text-white">
            问题 {i + 1}
          </span>
          <div className="text-xl font-bold leading-snug">{item.title}</div>
          {item.desc && (
            <div className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
              {item.desc}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
