# 网络实验台接入与验收

接入日期：2026-11-05。访问路径：`/network-lab/`。

## 来源和发布

从用户提供的 `network_proxy_lab` 原项目迁入当前使用的 HTML、CSS、浮窗脚本、仿真源码、离线 bundle、模型测试和许可证说明。`public/network-lab/README.md` 保留上游说明；其中提到的旧导览源码与历史备份不参与本次发布。没有迁入相邻的 Python 代理教程。

`source-manifest.json` 记录的是 **2026-11-05 迁入时**上游文件的 SHA-256，用于溯源，不是当前文件的校验清单。迁入时运行页面、全部样式、浮窗脚本、仿真源码和 bundle 与上游逐字节一致；仅调整独立构建命令与 NOTICE 中的文件说明。独立构建显式使用空的 TypeScript 配置，防止继承外层网站的编译选项。

2026-11-06 本地扩展了 IPv4 ARP 与链路层逐步仿真：新增第 19 个预设 `arp-gateway`、链路层详细模式开关、接口级稳定 MAC、每接口独立邻居缓存、等待队列、有限重试、超时失败与缓存老化，以及逐跳重新封装的以太网帧。因此 `index.html`、`src/network-config.js`、`src/network-engine.js`、`src/simulator-app.js`、`README.md`、`package.json`、`vendor/simulator.bundle.js` 与新增的 `verification/arp.test.mjs` 不再与上游逐字节一致；bundle 已由本地源码重新构建，许可证注释和 `vendor/NOTICE.md` 保持有效。

实验台作为 `public/` 下的独立静态应用，网站构建时复制到 `out/network-lab/`。首页、共享导航及网络课程目录增加普通网页链接，完整加载实验台。没有创建 Next.js 同名页面，也没有套入课程页布局。

继续使用网站既有发布方式：运行仓库检查与静态构建，将 `out/` 同步到 `gh-pages` 分支根目录，保留 `.nojekyll`，推送后由 GitHub Pages 发布。首页及现有课程随同保留。

## 更新与复验

更新实验台时，同步所需源码、样式与离线 bundle；保留许可证注释和 `vendor/NOTICE.md`。若修改源码，在 `public/network-lab/` 中执行 `npm ci`、`npm run build`、`npm test`。日常网站构建无需安装实验台的开发依赖；浏览器不需要后端、CDN 或本机服务。

迁入应用按独立项目保存，网站的 ESLint 和 Prettier 跳过该目录。其模型、抓包格式、机制图以及新增的 ARP 状态机由 `npm test` 的 95 项测试验证（原有 81 项 + 新增 14 项）。

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

报告分别保存在 `local/report.json`、`online/report.json`，包含浏览器、时间、各预设的实际结果、资源 URL 和错误计数；同目录保存页面截图。只有脚本实际通过后才生成 PASS 报告。抓包验收使用本地导出的模拟 pcap，以及独立构造的 IPv4/UDP DNS pcap、pcapng 文件；不使用个人真实抓包。报告验证工程功能，不代表已经授课或学生已掌握。

## 2026-11-06 ARP 扩展的本地验收

- 环境：Windows 侧 Node 22.22.2。本机安全策略将 `wsl.exe` 列入程序黑名单，本次未在 Linux 侧执行构建；外层网站 pnpm 依赖未安装，因此 `npm run types:check` / `npm run lint` / `npm run build` 未在本轮执行，需在具备依赖的环境补跑。
- 独立应用测试：`node --test` 与 `npm test` 均为 95 项全部通过（原有 81 项 + 新增 `verification/arp.test.mjs` 14 项）。`npm test` 在 UNC 工作目录下会被 Windows `cmd.exe` 拒绝，需在本地路径或 WSL 内执行。
- 离线 bundle：使用 esbuild 0.25.12 与 gsap 3.15.1 在临时目录由 `src/` 重新构建并写回 `vendor/simulator.bundle.js`，`node --check` 通过；未引入新的第三方运行时依赖。
- A → R → B 首次访问实测：48 个模型事件；去程两跳分别解析 192.168.1.1（网关）与 10.20.30.40（直连最终目标），IP 目的地址全程保持 10.20.30.40，TTL 在 R 上由 16 减为 15，两跳的源/目的 MAC 分别对应不同接口，结果 `SUCCESS`。
- 未部署、未合并到主分支；浏览器验收结果单独记录，未覆盖既有 `local/report.json` 与 `online/report.json`。

### 浏览器交互验收（本机回环）

用 Chrome 155 headless 通过调试协议加载 `http://127.0.0.1:8766/network-lab/`（静态服务器仅绑定 127.0.0.1，直接读取 `public/network-lab/`，未经过 `out/` 构建）。逐项输出保存在 `arp-browser.json`，结果 `PASS`，页面无 JS 错误：19 个预设；切到 `arp-gateway` 后详细模式自动开启；首次运行 48 个事件、6 类 ARP 事件、首个未命中目标为 192.168.1.1；去程两跳 MAC 各自不同、EtherType 0x0800、目的 IP 保持 10.20.30.40、TTL 16 → 15、生成 4 条按接口分开的缓存；前进→后退→前进步骤计数一致；看板显示 ARP 现场；二次请求 0 次广播 / 4 次缓存命中，清空缓存后恢复 4 次广播；关闭详细模式后 0 个 ARP 事件且原有示例 MAC 说明回归。该验收只验证工程功能，不代表已授课或学生已掌握。
