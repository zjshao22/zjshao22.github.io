import Link from "next/link";
import { ArrowRight, BrainCircuit, Presentation } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
      <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-2 text-sm text-fd-muted-foreground">
        <BrainCircuit className="size-4" /> 人工智能 · 网页课程
      </div>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
        从好奇开始，理解人工智能
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-fd-muted-foreground">
        十节课程，从 AI 的能力与局限，走到数据、机器学习、神经网络和大语言模型。
        每一节都可以在线阅读，也可以切换到逐屏演示。
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/docs/ai"
          className="inline-flex items-center gap-2 rounded-full bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground hover:opacity-90"
        >
          进入课程 <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/docs/ai/01-what-is-ai"
          className="inline-flex items-center gap-2 rounded-full border border-fd-border px-6 py-3 font-medium hover:bg-fd-accent"
        >
          <Presentation className="size-4" /> 从第一课开始
        </Link>
      </div>
    </main>
  );
}
