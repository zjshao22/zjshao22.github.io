type MdastNode = {
  type: string;
  value?: string;
  name?: string;
  attributes?: unknown[];
  children?: MdastNode[];
};

/**
 * Remark plugin to fix CommonMark limitations with CJK text and punctuation.
 * In CommonMark, **bold** immediately adjacent to CJK punctuation
 * (e.g. `**题 1：**服务端` or `**指针（地址）**彻底` or `哲学是**“相信程序员”**`)
 * fails the left-flanking / right-flanking rules and is left as literal text nodes.
 *
 * This plugin walks all text nodes and transforms any unparsed `**content**` into `strong` nodes.
 */
export default function remarkCjkBold() {
  function walk(node: MdastNode) {
    if (!node.children || !Array.isArray(node.children)) return;
    if (node.type === "code" || node.type === "inlineCode") return;

    const newChildren: MdastNode[] = [];
    for (const child of node.children) {
      if (
        child.type === "text" &&
        typeof child.value === "string" &&
        child.value.includes("**")
      ) {
        const parts = child.value.split(/(\*\*[^*]+?\*\*)/g);
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            newChildren.push({
              type: "strong",
              children: [{ type: "text", value: part.slice(2, -2) }],
            });
          } else {
            newChildren.push({ type: "text", value: part });
          }
        }
      } else {
        walk(child);
        newChildren.push(child);
      }
    }
    node.children = newChildren;
  }

  return (tree: MdastNode) => {
    walk(tree);
  };
}
