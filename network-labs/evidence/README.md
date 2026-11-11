# 真实传输实验证据（Real loopback socket evidence）

本目录保存的是**一次真实运行**产生的证据，不是构造或占位数据。程序生成真实 UDP / TCP 套接字，只绑定并发送到 `127.0.0.1` 的系统临时端口，记录 socket API 的真实返回值。

## 真实 / 模拟边界

- **真实（本目录、`real-evidence.js`、`real-lab.html`）**：`mode: "real"`，`host: "127.0.0.1"`。Python 3 标准库真实调用 `bind / connect / accept / sendto / recvfrom / sendall / recv / shutdown`。这是**观察 socket API 的返回值**，不是抓包，不是完整 TCP 实现，不做内核内省，也不产生 `.pcap`。
- **模拟（`/network-lab/index.html` 的 18 个预设）**：离散事件网络模型，不创建任何 socket，与实际链路无关。两套内容分开展示、分别标注。
- 本机回环收发成功**不能证明**公网或校园网的丢包、延迟、乱序、拥塞行为；它只说明本机协议栈对这组 API 调用的实际返回。

## 来源与运行环境

| 项           | 实际值                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| 操作系统     | `macOS-27.2-arm64-arm-64bit`（Darwin, arm64）                                     |
| Python       | `3.10.12`（CPython），仅标准库，无第三方依赖                                      |
| 脚本         | `real-transport-lab.py`，version `1.0.0`                                          |
| 地址族       | `AF_INET`；`bind(("127.0.0.1", 0))` 临时端口                                      |
| UTC 运行时间 | `2026-11-11T08:40:40.621449+00:00`（`generated_utc` / `environment.utc_started`） |
| 结果         | `result: "PASS"`（UDP、TCP 自检全部通过）                                         |

## 精确命令

生成本目录四个文件的命令（在同一次 `all` 进程内完成，保证数据来自同一真实运行）：

```sh
python3 public/network-labs/real-transport-lab.py all --chunk 7 --output-dir public/network-labs/evidence
```

另以独立命令分别验证两种真实模式（端口与上面那次不同，属另一次运行，不是本目录文件来源）：

```sh
python3 public/network-labs/real-transport-lab.py udp
python3 public/network-labs/real-transport-lab.py tcp
```

网页用的 JS 包装由**同一个** `real-transport.json` 直接生成，数据逐字段一致。以下命令可逐字节重建 `public/network-lab/real-evidence.js`：

```sh
python3 - <<'PY'
import json
d = json.load(open("public/network-labs/evidence/real-transport.json", encoding="utf-8"))
header = (
    "/* Real loopback socket evidence — generated from the SAME single run as\n"
    "   public/network-labs/evidence/real-transport.json (do not hand-edit).\n"
    "   Plain script so it works over file:// where fetch() of JSON is blocked.\n"
    "   mode=real / host=127.0.0.1 — observing the socket API, not packet capture. */\n"
)
with open("public/network-lab/real-evidence.js", "w", encoding="utf-8") as f:
    f.write(header)
    f.write("window.REAL_TRANSPORT_EVIDENCE = " + json.dumps(d, ensure_ascii=False, indent=2) + ";\n")
PY
```

## 文件清单

- `environment.json`：运行环境记录（Python / 平台 / UTC 时间 / 脚本版本 / 地址族 / 精确 CLI）。
- `udp-real.jsonl`：真实 UDP 有序事件，每行一个 JSON 事件，行内含 `mode: "real"`；含 0 字节数据报。
- `tcp-real.jsonl`：真实 TCP 有序事件，含 connect/accept、多次 `sendall` 切分、实际 `recv()` 块长与 EOF。
- `real-transport.json`：canonical 合并证据对象（`schema / environment / scope / udp / tcp / result`）。
- `../real-transport-lab.py`：生成脚本。

## 本次实际观察（端口/时间随运行变化）

- UDP：真实数据报长度 `3, 6, 0, 8` 逐一到达，端点均为 `127.0.0.1` + 临时端口（本次 `62952` / `62565`）；0 字节数据报单独到达，不是流结束。
- TCP：`sendall` 写入切分为 `[3, 8, 33]` 字节，本次 `all` 运行的实际 `recv()` 块长为 `[7, 7, 7, 7, 7, 7, 2]`（块边界与发送边界不一致），两条长度前缀消息均被重建，`shutdown(SHUT_WR)` 后 `recv()` 返回空字节（EOF）。
- 这些端口、时间戳、块长是**本机该次运行的实测值**；每次重跑都会变化，不能照抄为固定答案。例如另一次独立的 `tcp` 验证运行得到的 `recv()` 块长是 `[3, 7, 7, 7, 7, 7, 6]`，与本次不同——这正是“实际读取块”而非固定答案的体现。

## 失败处理

真实运行若超时、被防火墙阻断或任一自检失败，脚本会把 `result: "FAIL"` 与 `error` 写入证据、并以非零状态退出，绝不伪造成功。本次运行所有自检通过，无失败项。

参考：[UDP RFC 768](https://www.rfc-editor.org/rfc/rfc768.html)、[TCP RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html)。
