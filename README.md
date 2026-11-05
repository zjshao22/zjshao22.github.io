# 技术课程

静态网页课程，包含 C 语言、数据库、计算机网络与人工智能。课件支持互动图示、测验和逐屏演示；无需服务器、登录或数据库。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

`pnpm build` 会在 `out/` 生成可直接部署到 GitHub Pages 的静态网站。部署分支为 `gh-pages`，仓库根目录存放构建产物。进入任一课程页后，点击“演示”可切换逐屏模式。

网络实验台位于 `/network-lab/`，入口在网站导航、首页的计算机网络卡片和网络课程目录。`public/network-lab/` 保留原应用的界面、计算模型、离线依赖和许可证说明；构建网站时原样复制到 `out/network-lab/`。它不需要后端或 CDN，本地抓包文件只在浏览器内解析。更新方式和浏览器验收见 `docs/verification/network-lab/README.md`。

人工智能课程共 13 课，并在后半部分（第 5—13 课）补充推演、实验与练习；教学说明见 `docs/teaching/ai-course-design.md`。40 单元重建稿保存在 `docs/teaching/ai-rebuild-archive/`，供后续取材，不参与课程路由与导航。
