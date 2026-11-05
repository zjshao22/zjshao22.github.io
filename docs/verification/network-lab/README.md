# 网络实验台接入与验收

接入日期：2026-11-05。访问路径：`/network-lab/`。

## 来源和发布

从用户提供的 `network_proxy_lab` 原项目迁入当前使用的 HTML、CSS、浮窗脚本、仿真源码、离线 bundle、模型测试和许可证说明。`public/network-lab/README.md` 保留上游说明；其中提到的旧导览源码与历史备份不参与本次发布。没有迁入相邻的 Python 代理教程。

`source-manifest.json` 记录迁入文件的上游 SHA-256。运行页面、全部样式、浮窗脚本、仿真源码和 bundle 与上游逐字节一致；仅调整独立构建命令与 NOTICE 中的文件说明。独立构建显式使用空的 TypeScript 配置，防止继承外层网站的编译选项；使用原项目依赖重新构建的 bundle 与上游 SHA-256 一致。

实验台作为 `public/` 下的独立静态应用，网站构建时复制到 `out/network-lab/`。首页、共享导航及网络课程目录增加普通网页链接，完整加载实验台。没有创建 Next.js 同名页面，也没有套入课程页布局。

继续使用网站既有发布方式：运行仓库检查与静态构建，将 `out/` 同步到 `gh-pages` 分支根目录，保留 `.nojekyll`，推送后由 GitHub Pages 发布。首页及现有课程随同保留。

## 更新与复验

更新实验台时，同步所需源码、样式与离线 bundle；保留许可证注释和 `vendor/NOTICE.md`。若修改源码，在 `public/network-lab/` 中执行 `npm ci`、`npm run build`、`npm test`。日常网站构建无需安装实验台的开发依赖；浏览器不需要后端、CDN 或本机服务。

迁入应用按独立项目保存，网站的 ESLint 和 Prettier 跳过该目录，以保留上游代码和打包依赖的原始内容。其模型、抓包格式和机制图由原项目的 77 项测试验证。

网站必需检查：

```sh
npm run types:check
npm run lint
npm run build
npm --prefix public/network-lab test
```

浏览器验收脚本：`scripts/network-lab-audit.py`，需要安装 Python Playwright，默认使用本机 Chrome，可通过 `--browser` 指定其他 Chromium 可执行文件。对构建后的静态产物和线上页面使用同一份脚本：

```sh
python3 scripts/network-lab-audit.py --base-url http://127.0.0.1:8766 --output docs/verification/network-lab/local
python3 scripts/network-lab-audit.py --base-url https://zjshao22.github.io --output docs/verification/network-lab/online
```

本地预览仅需在仓库运行 `python3 -m http.server 8766 --bind 127.0.0.1 --directory out`。端口只用于验收，不是部署后的运行依赖。

报告分别保存在 `local/report.json`、`online/report.json`，包含浏览器、时间、18 个预设的实际结果、资源 URL 和错误计数；同目录保存页面截图。只有脚本实际通过后才生成 PASS 报告。抓包验收使用本地导出的模拟 pcap，以及独立构造的 IPv4/UDP DNS pcap、pcapng 文件；不使用个人真实抓包。报告验证工程功能，不代表已经授课或学生已掌握。
