# 人工智能课程

独立的静态网页课程，保留 `ai-course` 分支中的 AI 课件、互动图示、测验和逐屏演示。无需服务器、登录、数据库或在线判题。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

`pnpm build` 会在 `out/` 生成可直接部署到 GitHub Pages 的静态网站。部署分支为 `gh-pages`，仓库根目录存放构建产物。进入任一课程页后，点击“演示”可切换逐屏模式。
