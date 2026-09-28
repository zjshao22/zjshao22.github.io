import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: appName },
    links: [
      { text: "计算机网络", url: "/docs/network" },
      { text: "人工智能", url: "/docs/ai" },
    ],
  };
}
