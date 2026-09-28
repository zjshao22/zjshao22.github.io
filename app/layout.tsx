import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
import { appName } from "@/lib/shared";

export const metadata: Metadata = {
  title: { default: appName, template: `%s | ${appName}` },
  description: "计算机网络与人工智能的网页课程，支持互动图示和逐屏演示。",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
