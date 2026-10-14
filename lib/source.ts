import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { defineDocs } from "fumadocs-mdx/macro";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { docsRoute } from "./shared";

import type * as PageTree from "fumadocs-core/page-tree";
import type { PageTreeTransformer } from "fumadocs-core/source";

const docs = defineDocs({
  dir: "content/docs",
  docs: { schema: pageSchema },
  meta: { schema: metaSchema },
});

const separatorToFolderTransformer: PageTreeTransformer<any> = {
  folder(node) {
    if (!node.children || node.children.length === 0) return node;
    const hasSeparators = node.children.some(
      (child) => child.type === "separator",
    );
    if (!hasSeparators) return node;

    const newChildren: PageTree.Node[] = [];
    let currentFolder: PageTree.Folder | null = null;

    for (const child of node.children) {
      if (child.type === "separator") {
        currentFolder = {
          type: "folder",
          name: child.name,
          icon: child.icon,
          collapsible: true,
          defaultOpen: false,
          children: [],
          $id: `section-${String(child.name)}`,
        };
        newChildren.push(currentFolder);
      } else if (currentFolder) {
        currentFolder.children.push(child);
      } else {
        newChildren.push(child);
      }
    }

    return {
      ...node,
      children: newChildren,
    };
  },
};

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
  pageTree: {
    generateFallback: false,
    transformers: [separatorToFolderTransformer],
  },
});
