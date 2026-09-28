/**
 * 把手写的分屏标记 `{/* presenter:break *​/}` 转成 `<span data-presenter-break="">`，
 * 供逐屏演示的分页器识别为「此处必须断屏」。
 *
 * 为什么用这个语法：MDX v3 的 .mdx 文件里 HTML 注释 `<!-- -->` 是**解析错误**
 * （micromark 的 mdx-jsx 扩展禁用了 htmlFlow / htmlText）。只能用表达式注释
 * `{/* *​/}`——它在阅读态本来就渲染成空，这里只是给它加个锚点。
 *
 * 为什么不能输出 html 节点：hast-util-to-estree 没有 raw 节点处理器，MDX 编译会报
 * `Cannot handle unknown node 'raw'`。所以替换成 mdxJsxFlowElement。
 *
 * 只处理顶层 flow 节点：段落内部的 `{/* presenter:break *​/}` 不生效（也不需要）。
 * 装到 MDX 管线的方式见 source.config.ts；运行在 remarkStructure 之前，而后者只读树。
 */
type MdastNode = {
  type: string;
  value?: string;
  name?: string;
  attributes?: unknown[];
  children?: MdastNode[];
};

const BREAK_RE = /presenter\s*:\s*break/i;

const breakAnchor = (): MdastNode => ({
  type: "mdxJsxFlowElement",
  name: "span",
  attributes: [
    { type: "mdxJsxAttribute", name: "data-presenter-break", value: "" },
  ],
  children: [],
});

export default function remarkPresenterBreak() {
  return (tree: MdastNode) => {
    if (!Array.isArray(tree.children)) return;
    tree.children = tree.children.map((node) =>
      node.type === "mdxFlowExpression" &&
      typeof node.value === "string" &&
      BREAK_RE.test(node.value)
        ? breakAnchor()
        : node,
    );
  };
}
