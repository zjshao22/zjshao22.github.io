import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: appName },
    links: [{ text: "全部课程", url: "/docs/ai" }],
  };
}
