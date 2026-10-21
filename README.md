# 技术课程

静态网页课程，包含 C 语言、数据库、计算机网络与人工智能。课件支持互动图示、测验和逐屏演示；无需服务器、登录或数据库。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

`pnpm build` 会在 `out/` 生成可直接部署到 GitHub Pages 的静态网站。部署分支为 `gh-pages`，仓库根目录存放构建产物。进入任一课程页后，点击“演示”可切换逐屏模式。

人工智能沿用原有十课主线，并在第 5—10 课补充推演与练习；教学说明见 `docs/teaching/ai-course-design.md`。40 单元重建稿保存在 `docs/teaching/ai-rebuild-archive/`，供后续取材，不参与课程路由与导航。
