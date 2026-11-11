# 网络实验：端点、报文与可靠性

下载 `transport-lab.py`，安装 Python 3.9 或更新版本后，在文件所在目录运行。只用标准库，无需管理员权限，也不向外网发送请求。

```sh
python3 transport-lab.py udp
python3 transport-lab.py simulate
python3 transport-lab.py simulate --drop-ack 0
python3 transport-lab.py simulate --drop-ack 0 --naive
python3 transport-lab.py simulate --drop-data 1 --drop-ack 0
python3 transport-lab.py simulate --ack-delay 120 --timeout 100
```

`udp` 在本机 `127.0.0.1` 创建两个真实 UDP socket，操作系统分配空闲端口。发送三个数据报，长度依次为 3、6、0，接收方逐个记录来源、长度和内容，并回送长度。空数据报是有效报文；它不表示 TCP 的连接关闭。端口因运行而变。受系统防火墙或受限运行环境影响，真实 UDP 模式可能超时；此时应保留错误，不把模拟结果写成真实实验结果。

`simulate` 使用离散事件与虚拟毫秒，**没有创建网络 socket**。`--delay` 和 `--ack-delay` 分别设定数据、确认的单程模型延时。`--drop-data`、`--drop-ack` 指定从 0 开始的消息号，只抛弃相应消息的第一次发送或第一次确认，例如 `--drop-data 1,3`。`--naive` 故意让接收方重复交付重发消息，用来展示“重传就可靠”的缺陷。相同参数产生相同事件记录。

保存运行证据：

```sh
python3 transport-lab.py simulate --drop-ack 0 > ack-loss.jsonl
python3 transport-lab.py simulate --drop-ack 0 --naive > naive.jsonl
```

比较 `TIMEOUT`、`DISCARD_DUPLICATE`、`DELIVER_DUPLICATE` 和最后的 `application_deliveries`。文件中声明了实验模式。人为配置的模型丢失不能称为“校园网真实丢包”；本机 socket 正常收发也不能证明跨校园或公网路径无丢包。

模型用不回绕的消息编号、固定延时、无报文损坏、单个发送者和接收者，演示停等、确认、超时和去重。它没有实现 TCP 的字节序号、连接状态、校验和、窗口、拥塞控制或 QUIC 加密，不能作为这些协议的实现证据。

## 真实 UDP / TCP 回环套接字证据（real-transport-lab.py）

`real-transport-lab.py` 是本目录另一个独立脚本：只用 Python 3 标准库，仅绑定并发送到 `127.0.0.1` 的临时端口，不需要管理员权限或外网。它**观察 socket API 的返回值**，不是抓包，不产生 `.pcap`，不是完整 TCP 实现（无拥塞控制、重传、窗口、内核内省）。本机回环成功不能证明公网或校园网的丢包、延迟、乱序或拥塞。

```sh
python3 real-transport-lab.py --help
python3 real-transport-lab.py udp        # 真实 UDP：含 0 字节数据报、真实端点与回送
python3 real-transport-lab.py tcp        # 真实 TCP：connect/accept、切分 sendall、实际 recv 块长、EOF
python3 real-transport-lab.py all --chunk 7 --output-dir ./evidence
```

`udp` / `tcp` 把有序 JSONL 事件打印到标准输出（每行一个 JSON 事件，行内含 `mode: "real"` 与 `host: "127.0.0.1"`）。`all` 在同一次进程里跑完两种模式，并向 `--output-dir` 写出四个文件：

- `environment.json`：Python 版本、`platform.platform()`、UTC 时间、脚本版本、地址族、精确 CLI。
- `udp-real.jsonl` / `tcp-real.jsonl`：真实有序事件，含真实端口、长度、时间戳与自检。
- `real-transport.json`：canonical 合并证据对象。

仓库已保存一次真实运行的结果在 [`evidence/`](evidence/README.md)，并由同一份 `real-transport.json` 生成 `public/network-lab/real-evidence.js`，供 [真实传输实验页](/network-lab/real-lab.html) 离线回放。端口、时间戳与 `recv()` 块长每次运行都不同，以实际输出为准。

脚本带断言与自检：真实运行若超时、被防火墙阻断或任一检查失败，会写入 `result: "FAIL"` 与错误并以非零状态退出，**绝不伪造成功**。不要把上述真实运行与 `transport-lab.py simulate` 的虚拟时间模型混为同一类证据，也不要用模型成功掩盖真实套接字实验未完成。课程页见 [实验四：真实 UDP / TCP 回环套接字观察](/docs/network/lab-real-transport/)。
