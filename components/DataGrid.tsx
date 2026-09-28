export interface DataGridItem {
  /** 数据值 */
  value: string;
  /** 可选的说明（如单位、含义） */
  note?: string;
}

export interface DataGridProps {
  /** 网格上方的说明标题 */
  caption?: string;
  items: DataGridItem[];
}

export default function DataGrid({ caption, items }: DataGridProps) {
  return (
    <div className="datagrid my-6">
      {caption && (
        <div className="mb-3 text-sm font-medium text-fd-muted-foreground">
          {caption}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-baseline gap-2 rounded-xl border border-fd-border bg-fd-card/70 px-5 py-3"
          >
            <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-fd-primary">
              {item.value}
            </span>
            {item.note && (
              <span className="text-sm text-fd-muted-foreground">
                {item.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
