export interface DataShowcaseProps {
  /** 展示的数据内容 */
  value: string;
  /** 可选的说明文字（卡片内） */
  caption?: string;
}

export default function DataShowcase({ value, caption }: DataShowcaseProps) {
  return (
    <div className="my-6 flex items-center gap-4 rounded-xl border border-fd-border bg-fd-card/70 px-6 py-4">
      <span className="h-10 w-1 shrink-0 rounded-full bg-fd-primary" />
      <div>
        <div className="font-mono text-4xl font-semibold leading-none tracking-tight text-fd-primary">
          {value}
        </div>
        {caption && (
          <div className="mt-2 text-sm text-fd-muted-foreground">{caption}</div>
        )}
      </div>
    </div>
  );
}
