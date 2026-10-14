import { ArrowDown, Network, Router, Server } from "lucide-react";

export default function CampusTopologyFigure() {
  const segments = [
    {
      title: "学生区 · VLAN 10",
      prefix: "10.20.0.0/25",
      gateway: "网关 10.20.0.1",
    },
    {
      title: "教职工 · VLAN 20",
      prefix: "10.20.0.128/26",
      gateway: "网关 10.20.0.129",
    },
    {
      title: "服务区 · VLAN 30",
      prefix: "10.20.0.192/27",
      gateway: "网关 10.20.0.193",
    },
    {
      title: "管理区 · VLAN 40",
      prefix: "10.20.0.224/28",
      gateway: "网关 10.20.0.225",
    },
  ];
  return (
    <figure className="not-prose my-8 rounded-2xl border border-teal-900/15 bg-[#f3f7f4] p-5 text-slate-900 dark:border-teal-100/15 dark:bg-[#182927] dark:text-slate-100 sm:p-6">
      <figcaption className="mb-5 text-lg font-semibold">
        综合设计：四个广播域，经三层网关互联
      </figcaption>
      <div className="mx-auto max-w-sm rounded-xl border border-amber-700/25 bg-amber-500/10 p-4 text-center">
        <Server className="mx-auto mb-2 size-6" aria-hidden="true" />
        <p className="font-semibold">上游测试网络</p>
        <p className="mt-1 text-sm">默认路由 / 出口过滤 / 可选 NAT</p>
      </div>
      <ArrowDown className="mx-auto my-3 size-5" aria-hidden="true" />
      <div className="rounded-xl border border-teal-700/25 bg-teal-700/10 p-4 text-center dark:bg-teal-200/10">
        <Router className="mx-auto mb-2 size-6" aria-hidden="true" />
        <p className="font-semibold">三层网关 R：路由 + 各区访问策略</p>
        <p className="mt-1 text-sm">
          下联交换网络；trunk 只承载明确允许的 VLAN
        </p>
      </div>
      <ArrowDown className="mx-auto my-3 size-5" aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        {segments.map((segment) => (
          <div
            key={segment.prefix}
            className="min-w-0 rounded-xl border border-sky-700/20 bg-sky-600/10 p-4 dark:bg-sky-200/10"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Network className="size-4 shrink-0" aria-hidden="true" />
              {segment.title}
            </div>
            <p className="mt-2 font-mono text-sm">{segment.prefix}</p>
            <p className="mt-1 text-sm opacity-75">{segment.gateway}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-teal-900/10 pt-3 text-sm leading-6 opacity-75 dark:border-teal-100/10">
        构造拓扑，连线表示逻辑关系，不表示真实端口数量或物理部署。服务区课件服务器为
        .194，DNS 为 .195；地址容量与策略需要分别验证。
      </p>
    </figure>
  );
}
