import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Laptop, Router, Server } from "lucide-react";

function Figure({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border border-teal-900/15 bg-[#f3f7f4] text-slate-900 shadow-[0_14px_38px_-30px_rgba(13,63,53,0.55)] dark:border-teal-100/15 dark:bg-[#182927] dark:text-slate-100">
      <div className="border-b border-teal-900/10 px-5 py-4 dark:border-teal-100/10 sm:px-6">
        <p className="text-xs font-bold tracking-[0.17em] text-teal-800 dark:text-teal-200">
          NETWORK MODEL / 网络示意
        </p>
        <figcaption className="mt-1 text-lg font-bold">{title}</figcaption>
      </div>
      <div className="px-5 py-6 sm:px-6">{children}</div>
      <p className="border-t border-teal-900/10 px-5 py-3 text-sm leading-6 text-slate-600 dark:border-teal-100/10 dark:text-slate-300 sm:px-6">
        {caption}
      </p>
    </figure>
  );
}

function Field({
  label,
  value,
  tone = "teal",
}: {
  label: string;
  value: string;
  tone?: "teal" | "amber" | "sky" | "rose";
}) {
  const colors = {
    teal: "border-teal-700/20 bg-teal-700/10 dark:border-teal-200/20 dark:bg-teal-200/10",
    amber:
      "border-amber-700/20 bg-amber-500/15 dark:border-amber-200/20 dark:bg-amber-300/10",
    sky: "border-sky-700/20 bg-sky-600/10 dark:border-sky-200/20 dark:bg-sky-200/10",
    rose: "border-rose-700/20 bg-rose-600/10 dark:border-rose-200/20 dark:bg-rose-200/10",
  };
  return (
    <div className={`min-w-0 rounded-xl border px-4 py-4 ${colors[tone]}`}>
      <div className="text-xs font-bold tracking-wide opacity-70">{label}</div>
      <div className="mt-1 break-words text-base font-semibold">{value}</div>
    </div>
  );
}

export function DatagramFigure() {
  return (
    <Figure
      title="一份 IPv4 数据报由首部和负载组成"
      caption="首部提供转发所需的控制信息；负载装上层交来的数据。此图表达结构，不按真实字节长度绘制。"
    >
      <div className="grid gap-3 sm:grid-cols-[1.15fr_1fr]">
        <div className="rounded-xl border border-teal-700/20 bg-teal-700/10 p-4 dark:border-teal-200/20 dark:bg-teal-200/10">
          <div className="text-xs font-bold tracking-wide opacity-70">
            IP 首部
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Field label="源 IP" value="从哪里来" />
            <Field label="目标 IP" value="送往哪里" tone="amber" />
          </div>
          <p className="mb-0 mt-3 text-xs opacity-75">还有其他控制字段</p>
        </div>
        <Field label="IP 负载" value="来自传输层的数据" tone="sky" />
      </div>
    </Figure>
  );
}

export function HttpExchangeFigure() {
  return (
    <Figure
      title="浏览器与课程平台的一次应用层对话"
      caption="这是教学用的 HTTP/1.1 示例，不是某所学校平台的真实请求记录。实际通信还有首部，HTTPS 还会保护传输内容。"
    >
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="浏览器发出请求" value="GET /courses/network" tone="sky" />
        <ArrowRight
          className="mx-auto hidden size-5 text-teal-700 dark:text-teal-200 sm:block"
          aria-hidden="true"
        />
        <ArrowDown
          className="mx-auto size-5 text-teal-700 dark:text-teal-200 sm:hidden"
          aria-hidden="true"
        />
        <Field label="平台给出响应" value="200 OK ＋ 页面内容" tone="teal" />
      </div>
    </Figure>
  );
}

const layers = [
  {
    name: "TCP 段",
    header: "TCP 首部",
    payload: "应用数据",
    tone: "teal" as const,
  },
  {
    name: "IP 数据报",
    header: "IP 首部",
    payload: "TCP 段",
    tone: "amber" as const,
  },
  {
    name: "链路帧",
    header: "链路首部",
    payload: "IP 数据报",
    tone: "rose" as const,
  },
];

export function EncapsulationFigure() {
  return (
    <Figure
      title="发送时逐层加首部"
      caption="从 TCP 段开始，每层把上一层的数据作为负载并加上自己的首部；接收方反向处理。图示不按真实长度绘制。"
    >
      <div className="space-y-2">
        <div className="rounded-xl border border-sky-700/20 bg-sky-600/10 px-4 py-3 dark:border-sky-200/20 dark:bg-sky-200/10">
          <div className="text-xs font-bold tracking-wide opacity-70">
            应用数据
          </div>
          <div className="mt-1 font-semibold">请求网络基础课件</div>
        </div>
        <ArrowDown
          className="mx-auto size-4 text-teal-700 dark:text-teal-200"
          aria-hidden="true"
        />
        {layers.map((layer, index) => (
          <div key={layer.name}>
            <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-[5.8rem_1fr_1.4fr]">
              <div className="col-span-2 flex items-center text-sm font-bold text-teal-900 dark:text-teal-100 sm:col-span-1">
                {layer.name}
              </div>
              <Field label="首部" value={layer.header} tone={layer.tone} />
              <Field label="负载" value={layer.payload} tone="sky" />
            </div>
            {index < layers.length - 1 && (
              <ArrowDown
                className="mx-auto my-1 size-4 text-teal-700 dark:text-teal-200 sm:ml-[6.2rem]"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </Figure>
  );
}

export function ByteOrderFigure() {
  return (
    <Figure
      title="同一个两字节数，两种排列"
      caption="数值 1024 写作十六进制 0x0400。网络字节序规定高位字节在前，即图中的大端排列。"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-teal-700/20 bg-white/70 p-4 dark:border-teal-200/20 dark:bg-white/5">
          <p className="mb-3 mt-0 font-bold">大端 · 网络字节序</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="第 1 字节" value="0x04" tone="teal" />
            <Field label="第 2 字节" value="0x00" tone="sky" />
          </div>
        </div>
        <div className="rounded-xl border border-amber-700/20 bg-white/70 p-4 dark:border-amber-200/20 dark:bg-white/5">
          <p className="mb-3 mt-0 font-bold">小端 · 对照</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="第 1 字节" value="0x00" tone="amber" />
            <Field label="第 2 字节" value="0x04" tone="rose" />
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function IPv4PrefixFigure() {
  return (
    <Figure
      title="192.168.10.34/24 怎样分出网段"
      caption="/24 表示前 24 位属于网络前缀，即前三个八位组；余下 8 位用于区分该块内地址。"
    >
      <div className="grid grid-cols-4 gap-2">
        {["192", "168", "10", "34"].map((octet, index) => (
          <Field
            key={index}
            label={index < 3 ? `前缀 ${index + 1}` : "余下位"}
            value={octet}
            tone={index < 3 ? "teal" : "amber"}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[3fr_1fr] gap-2 text-center text-xs font-semibold sm:text-sm">
        <span className="rounded-lg bg-teal-700/15 px-2 py-2 dark:bg-teal-200/15">
          前 24 位：192.168.10
        </span>
        <span className="rounded-lg bg-amber-500/20 px-2 py-2 dark:bg-amber-300/15">
          后 8 位
        </span>
      </div>
    </Figure>
  );
}

export function ArpFigure() {
  const devices = [
    {
      title: "宿舍笔记本",
      detail: "知道网关 IP，不知道其链路地址",
      Icon: Laptop,
    },
    { title: "本地网络", detail: "广播询问：谁有网关 IP？", Icon: Router },
    {
      title: "网关接口",
      detail: "回答：这个 IP 对应我的链路地址",
      Icon: Server,
    },
  ];
  return (
    <Figure
      title="在本地链路查找下一跳地址"
      caption="ARP 只在当前 IPv4 链路上寻找下一跳的链路地址；它不负责寻找远端网站的链路地址。"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {devices.map(({ title, detail, Icon }, index) => (
          <div
            key={title}
            className="rounded-xl border border-teal-800/15 bg-white/75 p-4 dark:border-teal-100/15 dark:bg-white/5"
          >
            <div className="flex items-center gap-2 font-bold">
              <span className="flex size-9 items-center justify-center rounded-lg bg-teal-700/10 text-teal-900 dark:bg-teal-200/10 dark:text-teal-100">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                {index + 1}. {title}
              </span>
            </div>
            <p className="mb-0 mt-3 text-sm leading-6 opacity-80">{detail}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}
