# 技术课程

静态网页课程，包含人工智能与计算机网络。课件支持互动图示、测验和逐屏演示；无需服务器、登录或数据库。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

`pnpm build` 会在 `out/` 生成可直接部署到 GitHub Pages 的静态网站。部署分支为 `gh-pages`，仓库根目录存放构建产物。进入任一课程页后，点击“演示”可切换逐屏模式。
