import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
import { appName } from "@/lib/shared";

export const metadata: Metadata = {
  title: { default: appName, template: `%s | ${appName}` },
  description: "人工智能课程：从基本概念到机器学习、大语言模型。",
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
