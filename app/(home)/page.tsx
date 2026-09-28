import Link from "next/link";
import { ArrowRight, BrainCircuit, Globe2, Presentation } from "lucide-react";

const courses = [
  {
    title: "计算机网络",
    description: "从校园网、班级群和课程平台出发，理解数据怎样穿过网络。",
    href: "/docs/network",
    lesson: "/docs/network/01-how-web-works",
    count: "4 节课程",
    Icon: Globe2,
    tone: "border-teal-700/20 bg-[#e8f2ed] text-teal-950 dark:border-teal-200/20 dark:bg-[#183633] dark:text-teal-50",
  },
  {
    title: "人工智能",
    description: "从基本概念走到数据、机器学习、神经网络和大语言模型。",
    href: "/docs/ai",
    lesson: "/docs/ai/01-what-is-ai",
    count: "10 节课程",
    Icon: BrainCircuit,
    tone: "border-amber-700/20 bg-[#f5efe3] text-amber-950 dark:border-amber-200/20 dark:bg-[#3a3020] dark:text-amber-50",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:py-24">
      <div className="max-w-3xl">
        <p className="mb-5 text-sm font-bold tracking-[0.16em] text-teal-800 dark:text-teal-300">
          LEARN / EXPLORE / EXPLAIN
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          从一个问题开始，
          <br />
          把技术讲明白。
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-fd-muted-foreground">
          选择一门课程，阅读知识、尝试互动图示，或切换逐屏演示。
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {courses.map(
          ({ title, description, href, lesson, count, Icon, tone }) => (
            <section
              key={title}
              className={`flex min-h-72 flex-col rounded-2xl border p-7 ${tone}`}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-9" strokeWidth={1.5} aria-hidden="true" />
                <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium">
                  {count}
                </span>
              </div>
              <h2 className="mt-8 text-3xl font-semibold">{title}</h2>
              <p className="mt-3 max-w-sm leading-7 opacity-80">
                {description}
              </p>
              <div className="mt-auto flex flex-wrap gap-5 pt-8 text-sm font-semibold">
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  浏览课程 <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={lesson}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <Presentation className="size-4" /> 进入第一课
                </Link>
              </div>
            </section>
          ),
        )}
      </div>
    </main>
  );
}
