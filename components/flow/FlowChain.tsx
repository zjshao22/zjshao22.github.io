import { ArrowDown } from "lucide-react";

export interface FlowStep {
  title: string;
  /** 指向下一步的连接标签，如“记录” */
  action?: string;
  /** 补充说明 */
  note?: string;
  /** 圆点颜色（Tailwind bg 类），默认主题色 */
  color?: string;
}

export default function FlowChain({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="my-8 flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const dot = step.color ?? "bg-fd-primary";
        return (
          <div key={i}>
            <div className="flex items-stretch gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center">
                <span
                  className={`mt-4 size-2.5 shrink-0 rounded-full ${dot}`}
                />
                {!isLast && <span className="mt-1 w-px flex-1 bg-fd-border" />}
              </div>
              <div className="mb-2 flex-1 rounded-xl border border-fd-border bg-fd-card/70 px-4 py-3">
                <div className="font-semibold">{step.title}</div>
                {step.note && (
                  <div className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                    {step.note}
                  </div>
                )}
              </div>
            </div>
            {!isLast && (
              <div className="flex items-center gap-3">
                <div className="flex w-6 shrink-0 flex-col items-center">
                  <span className="h-4 w-px bg-fd-border" />
                </div>
                <div className="flex flex-1 items-center gap-1.5 pb-3 text-sm font-medium text-fd-muted-foreground">
                  <ArrowDown className="size-3.5" />
                  {step.action && <span>{step.action}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
