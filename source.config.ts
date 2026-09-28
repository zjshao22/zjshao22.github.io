import { defineConfig } from "fumadocs-mdx/config";
import type { MDXPresetOptions } from "fumadocs-mdx/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkPresenterBreak from "./lib/remark-presenter-break";

export default defineConfig({
  mdxOptions: {
    preset: "fumadocs",
    // remarkPresenterBreak：把手写的 `{/* presenter:break */}` 变成带 data 属性的
    // 锚点元素，放映时按「此处必须断屏」处理（见 lib/remark-presenter-break.ts）
    remarkPlugins: [remarkMath, remarkPresenterBreak],
    // 必须放在 rehype-code 之前，把 math 节点转成 KaTeX HTML，否则会被当作 language=math 代码块
    rehypePlugins: (plugins) => [rehypeKatex, ...plugins],
  } satisfies MDXPresetOptions,
});
