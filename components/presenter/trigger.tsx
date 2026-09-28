"use client";

import { Presentation } from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";

export const PRESENTER_OPEN_EVENT = "presenter:open";

export function PresenterTrigger() {
  return (
    <button
      type="button"
      aria-label="进入逐屏演示模式"
      title="逐屏演示（适合上课投影）"
      onClick={() =>
        window.dispatchEvent(new CustomEvent(PRESENTER_OPEN_EVENT))
      }
      className={buttonVariants({
        color: "secondary",
        size: "sm",
        className: "gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground",
      })}
    >
      <Presentation />
      演示
    </button>
  );
}
