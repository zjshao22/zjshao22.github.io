"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Globe2,
  Laptop,
  Network,
  RadioTower,
  Server,
} from "lucide-react";

const stages = [
  {
    label: "读网址",
    badge: "01 / 06",
    title: "先拆开一个 URL",
    detail:
      "浏览器从 https://media.example/intro 中读出协议、主机名和资源路径。主机名是 media.example；/intro 指向要获取的资源。",
    question: "此时还没有把网页内容送过网络。",
    active: [0],
  },
  {
    label: "找地址",
    badge: "02 / 06",
    title: "取得目标地址",
    detail:
      "如果没有可用的缓存结果，设备会向 DNS 解析器查询主机名对应的地址。结果可能受地区、服务配置等影响。",
    question: "DNS 负责名称解析；它本身不负责传送网页。",
    active: [0],
  },
  {
    label: "逐跳转发",
    badge: "03 / 06",
    title: "数据包经过网络",
    detail:
      "设备把数据交给本地网络；路由器根据目标 IP 地址选择下一跳。这里画的是一条示意路径，真实路径可以不同。",
    question: "每一跳处理的是转发任务，不必知道页面标题。",
    active: [0, 1, 2, 3],
  },
  {
    label: "建立通信",
    badge: "04 / 06",
    title: "准备传输与加密",
    detail:
      "本示例假设使用基于 TCP 的 HTTPS：先建立 TCP 连接，再进行 TLS 握手。实际网站也可能使用基于 QUIC 的 HTTP/3。",
    question: "TCP 的可靠字节流和 TLS 的加密各解决不同问题。",
    active: [0, 3],
  },
  {
    label: "请求资源",
    badge: "05 / 06",
    title: "浏览器发出 HTTP 请求",
    detail:
      "浏览器请求 /intro；服务器返回状态码与内容。若资源不存在，可能收到 404：这说明 HTTP 已经有响应，故障不在 DNS。",
    question: "HTTP 说明请求什么、返回什么，不替路由器选路。",
    active: [0, 3],
  },
  {
    label: "呈现页面",
    badge: "06 / 06",
    title: "网页逐步出现",
    detail:
      "浏览器解析收到的内容，并可能继续请求样式、图片和脚本。看到页面不意味着只传输过一个数据包或只发出一个请求。",
    question: "缓存、复用连接和资源数量都会改变实际过程。",
    active: [0, 3],
  },
];

const nodes = [
  { label: "浏览器", caption: "发起请求", Icon: Laptop },
  { label: "本地网络", caption: "接入链路", Icon: RadioTower },
  { label: "路由器", caption: "选择下一跳", Icon: Network },
  { label: "服务器", caption: "提供资源", Icon: Server },
];

export default function RequestJourney() {
  const [index, setIndex] = useState(0);
  const stage = stages[index];

  return (
    <section
      className="not-prose my-8 overflow-hidden rounded-2xl border border-teal-800/20 bg-[#f2f7f4] text-slate-900 shadow-[0_18px_45px_-32px_rgba(10,50,45,0.45)] dark:border-teal-200/20 dark:bg-[#142625] dark:text-slate-100"
      aria-label="网页请求路径互动演示"
    >
      <div className="border-b border-teal-900/10 bg-[#dcece5] px-5 py-4 dark:border-teal-100/10 dark:bg-[#1d3734] sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-teal-900 dark:text-teal-100">
            <Globe2 className="size-4" /> REQUEST TRACE / 请求路径
          </div>
          <span className="rounded-full border border-teal-700/20 px-3 py-1 font-mono text-xs text-teal-900 dark:text-teal-100">
            https://media.example/intro
          </span>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[13rem_1fr]">
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
          role="group"
          aria-label="请求阶段"
        >
          {stages.map((item, itemIndex) => (
            <button
              key={item.badge}
              type="button"
              aria-pressed={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
              className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                itemIndex === index
                  ? "bg-teal-800 text-white dark:bg-teal-200 dark:text-teal-950"
                  : "border border-teal-900/10 bg-white/70 hover:bg-white dark:border-teal-100/10 dark:bg-white/5 dark:hover:bg-white/10"
              }`}
            >
              <span className="font-mono text-xs opacity-65">
                {item.badge.slice(0, 2)}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-w-0">
          <div
            className="mb-3 grid grid-cols-4 gap-1"
            aria-label="网页数据的示意路径"
          >
            {nodes.map(({ label, caption, Icon }, nodeIndex) => {
              const active = stage.active.includes(nodeIndex);
              return (
                <div
                  key={label}
                  className="relative flex min-w-0 flex-col items-center text-center"
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl border sm:size-12 ${
                      active
                        ? "border-amber-500 bg-amber-400 text-slate-950 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]"
                        : "border-teal-900/15 bg-white/80 text-teal-950 dark:border-teal-100/15 dark:bg-white/10 dark:text-teal-100"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <strong className="mt-2 text-xs sm:text-sm">{label}</strong>
                  <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                    {caption}
                  </span>
                  {nodeIndex < nodes.length - 1 && (
                    <ArrowRight
                      className="absolute left-[calc(100%-0.2rem)] top-4 size-3 text-teal-800/50 dark:text-teal-100/50 sm:top-5"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            className={`mb-5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm ${
              index === 1
                ? "border-amber-500 bg-amber-400/20 text-teal-950 dark:text-amber-100"
                : "border-teal-900/10 bg-white/50 text-slate-600 dark:border-teal-100/10 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
            DNS 解析器：参与名称查询，不在网页内容传送路径上
          </div>

          <div
            aria-live="polite"
            className="rounded-xl border border-teal-900/10 bg-white/85 p-5 dark:border-teal-100/10 dark:bg-black/15"
          >
            <p className="font-mono text-xs font-semibold tracking-widest text-teal-800 dark:text-teal-200">
              {stage.badge}
            </p>
            <h3 className="mt-2 text-xl font-bold">{stage.title}</h3>
            <p className="mt-3 text-sm leading-7 sm:text-base">
              {stage.detail}
            </p>
            <p className="mt-4 flex items-start gap-2 border-t border-teal-900/10 pt-4 text-sm font-medium text-teal-900 dark:border-teal-100/10 dark:text-teal-100">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{" "}
              {stage.question}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              简化模型：首次访问、无可用缓存、基于 TCP 的 HTTPS
            </span>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % stages.length)}
              className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              {index === stages.length - 1 ? "从头播放" : "下一步 →"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
