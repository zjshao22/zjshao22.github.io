import type { ReactNode } from "react";
import {
  Binary,
  Code2,
  Cpu,
  FileCode,
  HardDrive,
  Layers,
  ArrowRight,
  Split,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  MoveDown,
  CornerDownRight,
  Database,
  Terminal,
} from "lucide-react";

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
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border border-sky-900/15 bg-[#f6f9fc] text-slate-900 shadow-[0_14px_38px_-30px_rgba(30,41,59,0.35)] dark:border-sky-100/15 dark:bg-[#121926] dark:text-slate-100">
      <div className="border-b border-sky-900/10 px-5 py-4 dark:border-sky-100/10 sm:px-6">
        <p className="text-xs font-bold tracking-[0.17em] text-sky-700 dark:text-sky-300">
          C PROGRAMMING / C 语言程序设计与内存模型
        </p>
        <figcaption className="mt-1 text-lg font-bold">{title}</figcaption>
      </div>
      <div className="px-5 py-6 sm:px-6">{children}</div>
      <p className="border-t border-sky-900/10 px-5 py-3 text-sm leading-6 text-slate-600 dark:border-sky-100/10 dark:text-slate-300 sm:px-6">
        {caption}
      </p>
    </figure>
  );
}

/**
 * 1. 编译链接流水线：.c -> .i -> .s -> .obj/.o -> .exe
 */
export function CCompilationPipelineFigure() {
  const stages = [
    {
      step: "01 预处理 (Preprocessing)",
      file: "main.c → main.i",
      tool: "预处理器 (cpp)",
      desc: "展开 #include 头文件，替换 #define 宏定义，处理 #if 条件编译，去除注释",
      badge: "文本替换",
    },
    {
      step: "02 编译 (Compilation)",
      file: "main.i → main.s",
      tool: "编译器 (gcc / clang)",
      desc: "词法语法分析，语义检查与优化，将 C 语言翻译为特定架构的汇编指令",
      badge: "语法分析与优化",
    },
    {
      step: "03 汇编 (Assembly)",
      file: "main.s → main.obj / .o",
      tool: "汇编器 (as)",
      desc: "将汇编代码逐句翻译为机器码（二进制），生成可重定位目标文件",
      badge: "二进制目标码",
    },
    {
      step: "04 链接 (Linking)",
      file: "main.obj + 库 → main.exe",
      tool: "链接器 (ld)",
      desc: "合并多个目标文件，解析外部符号与标准 C 库函数（如 printf），生成可执行文件",
      badge: "符号解析与地址重定位",
    },
  ];

  return (
    <Figure
      title="从源程序到可执行文件：C 语言编译构建四阶段"
      caption="C 语言属于编译型高级语言。源文件 (.c) 必须经历预处理、编译、汇编生成目标文件 (.obj)，最终由链接器与系统库绑定为可执行文件 (.exe)。"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((st, i) => (
          <div
            key={st.step}
            className="flex flex-col rounded-xl border border-sky-500/20 bg-white p-4 shadow-sm dark:bg-[#1a2333]"
          >
            <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 text-xs">
              <span className="font-semibold text-sky-700 dark:text-sky-300">
                {st.step}
              </span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                {st.badge}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
              <FileCode className="size-4 text-sky-500" />
              {st.file}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              核心工具：{st.tool}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {st.desc}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/**
 * 2. C 语言内存布局模型
 */
export function CMemoryLayoutFigure() {
  return (
    <Figure
      title="C 语言程序在操作系统中的虚拟内存空间布局"
      caption="栈区由系统自动分配和释放（存放局部变量与函数栈帧，高地址向低地址生长）；堆区由程序员手动申请 malloc 与释放 free（低地址向高地址生长）。"
    >
      <div className="mx-auto max-w-2xl space-y-2 text-xs font-mono">
        {/* 高地址 */}
        <div className="text-right text-[11px] text-slate-400">
          ▲ 内存高地址 (0xFFFFFFFF / 0x7FFFFFFFFFFF)
        </div>

        {/* 环境变量与命令行参数 */}
        <div className="rounded-lg border border-slate-300 bg-slate-200/80 p-3 text-center dark:border-slate-700 dark:bg-slate-800/80">
          <div className="font-bold text-slate-700 dark:text-slate-200">
            命令行参数与环境变量 (Kernel Space / Args & Env)
          </div>
          <div className="text-[11px] text-slate-500">
            argc, argv, 系统环境变量
          </div>
        </div>

        {/* 栈区 */}
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <Layers className="size-4" /> 栈区 (Stack) —— 向低地址延伸 ↓
          </div>
          <div className="mt-1 text-slate-600 dark:text-slate-300">
            函数局部变量、形参、返回值、函数调用返回地址（进入函数自动压栈，离开函数自动弹栈）
          </div>
        </div>

        {/* 自由空白内存区 */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 p-2 text-center text-slate-400 dark:border-slate-700">
          <span>↓ 栈向下增长 (Push)</span>
          <span className="font-sans text-[11px] font-bold">
            空闲虚拟地址空间 (Unallocated Space)
          </span>
          <span>↑ 堆向上增长 (Brk/Mmap)</span>
        </div>

        {/* 堆区 */}
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <HardDrive className="size-4" /> 堆区 (Heap) —— 向高地址延伸 ↑
          </div>
          <div className="mt-1 text-slate-600 dark:text-slate-300">
            动态分配内存：malloc(), calloc(), realloc() 申请，必须通过 free()
            手动释放
          </div>
        </div>

        {/* BSS 与 数据段 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-center">
            <div className="font-bold text-indigo-800 dark:text-indigo-300">
              BSS 段 (未初始化全局/静态区)
            </div>
            <div className="text-[11px] text-slate-500">
              未初始化的全局变量与 static 变量（内核自动置 0）
            </div>
          </div>
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-center">
            <div className="font-bold text-indigo-800 dark:text-indigo-300">
              数据段 Data (已初始化全局/静态区)
            </div>
            <div className="text-[11px] text-slate-500">
              初始值不为 0 的全局变量与 static 变量
            </div>
          </div>
        </div>

        {/* 代码段与只读常量 */}
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            代码段 Text / 只读数据段 RODATA (Read-Only)
          </div>
          <div className="text-[11px] text-slate-500">
            机器指令二进制代码，以及字符串常量字面量（如 &quot;Hello
            World&quot;，不可写入修改）
          </div>
        </div>

        <div className="text-left text-[11px] text-slate-400">
          ▼ 内存低地址 (0x00000000)
        </div>
      </div>
    </Figure>
  );
}

/**
 * 3. 指针、地址与解引用图解
 */
export function PointerIndirectionFigure() {
  return (
    <Figure
      title="指针变量的本质：保存另一个变量的物理内存首地址"
      caption="变量 a 存放具体数值 42；指针变量 p 存放的是 a 的地址 0x7ffd58。对 p 进行解引用 (*p) 等同于直接读写变量 a。"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* 指针变量 p */}
        <div className="rounded-xl border border-sky-500/30 bg-white p-5 shadow-sm dark:bg-[#1a2333]">
          <div className="flex items-center justify-between border-b border-sky-500/15 pb-2">
            <div className="font-mono text-sm font-bold text-sky-700 dark:text-sky-300">
              int *p = &a;
            </div>
            <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
              指针变量 p
            </span>
          </div>
          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between rounded bg-slate-100 p-2 dark:bg-slate-800">
              <span className="text-slate-500">变量自身地址 &p:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                0x7ffd70
              </span>
            </div>
            <div className="flex justify-between rounded bg-sky-50 p-2 dark:bg-sky-950/50">
              <span className="text-sky-700 dark:text-sky-300">
                p 内部存放的值:
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                0x7ffd58 (即 &a)
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-100 p-2 dark:bg-slate-800">
              <span className="text-slate-500">指针自身大小:</span>
              <span>8 字节 (64位系统) / 4 字节 (32位)</span>
            </div>
          </div>
        </div>

        {/* 目标变量 a */}
        <div className="rounded-xl border border-emerald-500/30 bg-white p-5 shadow-sm dark:bg-[#1a2333]">
          <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
            <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
              int a = 42;
            </div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              整型目标变量 a
            </span>
          </div>
          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between rounded bg-emerald-50 p-2 dark:bg-emerald-950/50">
              <span className="text-emerald-700 dark:text-emerald-300">
                变量首地址 &a:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                0x7ffd58
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-100 p-2 dark:bg-slate-800">
              <span className="text-slate-500">变量存储的数值 a:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                42
              </span>
            </div>
            <div className="flex justify-between rounded bg-amber-50 p-2 dark:bg-amber-950/50">
              <span className="text-amber-700 dark:text-amber-300">
                解引用操作 *p:
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                *p ≡ 42 (直接操作 a)
              </span>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/**
 * 4. swap 两数交换栈帧对比：传值 vs 传指针
 */
export function SwapStackFigure() {
  return (
    <Figure
      title="函数参数传递机制：值传递（传副本） vs 地址传递（传指针）"
      caption="左图传值：swap 函数只修改了自己栈帧里的局部拷贝 x 和 y，main 中的 a 和 b 毫发无损；右图传地址：swap 凭借指针直接穿透栈帧修改了 main 里的原始内存。"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* 错误的值传递 */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 border-b border-red-500/20 pb-2 text-sm font-bold text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4" /> 错误示范：值传递 swap(a, b)
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="rounded bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-500">
                swap 局部栈帧（被调用方）
              </div>
              <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                形参 x = 5, y = 9（从实参复制出来的独立副本）
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                交换后：x = 9, y = 5。函数返回后栈帧销毁，数据全部丢弃！
              </p>
            </div>
            <div className="rounded bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-500">
                main 栈帧（调用方）
              </div>
              <p className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                a = 5, b = 9（未发生任何改变 ❌）
              </p>
            </div>
          </div>
        </div>

        {/* 正确的指针传递 */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> 正确示范：指针传递 swap(&a, &b)
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="rounded bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-500">
                swap 局部栈帧（被调用方）
              </div>
              <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                p1 = &a (0x7ffd50), p2 = &b (0x7ffd54)
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                通过 *p1 和 *p2 直接按地址跨栈帧写入 main 的内存单元！
              </p>
            </div>
            <div className="rounded bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-500">
                main 栈帧（调用方）
              </div>
              <p className="mt-1 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                a = 9, b = 5（成功实现交换并持久生效 ✔）
              </p>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/**
 * 5. 字符数组与字符串终止符 '\0'
 */
export function StringArrayMemoryFigure() {
  const chars = [
    { char: "'C'", ascii: "67", idx: "0", note: "数据字符" },
    { char: "'h'", ascii: "104", idx: "1", note: "数据字符" },
    { char: "'i'", ascii: "105", idx: "2", note: "数据字符" },
    { char: "'n'", ascii: "110", idx: "3", note: "数据字符" },
    { char: "'a'", ascii: "97", idx: "4", note: "数据字符" },
    { char: "'\\0'", ascii: "0", idx: "5", note: "字符串结束符 (哨兵)" },
  ];

  return (
    <Figure
      title={"字符串在内存中的连续存储与 '\\0' (Null Terminator)"}
      caption={
        "char str[] = \"China\"; 实际占用 6 个字节。字符串函数 strlen 统计到 '\\0' 之前（长度为 5），sizeof 统计整块数组内存占用（大小为 6 字节）。"
      }
    >
      <div className="overflow-x-auto">
        <div className="flex min-w-[500px] gap-2 font-mono">
          {chars.map((c, i) => (
            <div
              key={c.idx}
              className={`flex-1 rounded-xl border p-3 text-center ${
                c.char === "'\\0'"
                  ? "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200"
                  : "border-sky-500/30 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="text-[11px] text-slate-400">下标 [{c.idx}]</div>
              <div className="my-2 text-2xl font-bold">{c.char}</div>
              <div className="text-xs text-slate-500">ASCII: {c.ascii}</div>
              <div className="mt-2 text-[10px] font-sans font-medium text-slate-600 dark:text-slate-300">
                {c.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Figure>
  );
}

/**
 * 6. 结构体内存对齐与 sizeof 原理
 */
export function StructAlignmentFigure() {
  return (
    <Figure
      title="结构体内存对齐（Byte Alignment）与填充空洞（Padding）"
      caption="CPU 读取内存以对齐数（通常为 4 或 8 字节）为单位。struct Data { char a; int b; short c; }; 虽然成员占 1+4+2=7 字节，但因内存对齐实际占用 12 字节。"
    >
      <div className="space-y-4 text-xs font-mono">
        <div className="rounded-xl border border-sky-500/20 bg-white p-4 dark:bg-slate-900">
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            struct Example &#123; char a; int b; short c; &#125;; 内存 12
            字节剖析
          </div>
          <div className="mt-3 grid grid-cols-12 gap-1 text-center font-bold">
            {/* byte 0: char a */}
            <div className="col-span-1 rounded bg-emerald-500/20 p-2 text-emerald-800 dark:text-emerald-300">
              0<br />
              <span className="text-[10px]">char a</span>
            </div>
            {/* byte 1-3: padding */}
            <div className="col-span-3 rounded border border-dashed border-red-400 bg-red-500/10 p-2 text-red-700 dark:text-red-300">
              1 ~ 3<br />
              <span className="text-[10px]">padding 填充 3 字节</span>
            </div>
            {/* byte 4-7: int b */}
            <div className="col-span-4 rounded bg-sky-500/20 p-2 text-sky-800 dark:text-sky-300">
              4 ~ 7<br />
              <span className="text-[10px]">
                int b (占 4 字节，起始于 4 的倍数)
              </span>
            </div>
            {/* byte 8-9: short c */}
            <div className="col-span-2 rounded bg-amber-500/20 p-2 text-amber-800 dark:text-amber-300">
              8 ~ 9<br />
              <span className="text-[10px]">short c</span>
            </div>
            {/* byte 10-11: tail padding */}
            <div className="col-span-2 rounded border border-dashed border-red-400 bg-red-500/10 p-2 text-red-700 dark:text-red-300">
              10 ~ 11
              <br />
              <span className="text-[10px]">末尾 padding 2 字节</span>
            </div>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          💡 <strong>对齐规则</strong>
          ：结构体各成员偏移量必须为其自身大小的整数倍；结构体总大小必须为最大成员大小（此处为
          int 的 4 字节）的整数倍。因此末尾补充 2 字节达到 12 字节。
        </p>
      </div>
    </Figure>
  );
}

/**
 * 7. 标准输入流 stdin 缓冲区与换行符残存机制
 */
export function InputBufferFigure() {
  return (
    <Figure
      title="标准输入流 stdin 缓冲区与 scanf 换行符残留陷阱"
      caption={
        "当用户在键盘输入 100 并敲下回车时，缓冲区中存入的是 '1','0','0','\\n'。scanf(\"%d\", &num) 读走 100 后，'\\n' 仍然留在缓冲区中，会导致紧随其后的 getchar() 或 scanf(\"%c\") 误读！"
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="font-bold text-slate-700 dark:text-slate-300">
              1. 用户键盘键入
            </div>
            <p className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
              输入：
              <span className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                100 [Enter]
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              敲下 Enter 触发操作系统将整行输入推送给标准输入缓冲区 stdin
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="font-bold text-amber-800 dark:text-amber-300">
              2. stdin 缓冲队列
            </div>
            <div className="mt-2 flex gap-1 font-mono text-xs">
              <span className="rounded bg-sky-200 px-2 py-1 text-sky-900 dark:bg-sky-800 dark:text-sky-100">
                &apos;1&apos;
              </span>
              <span className="rounded bg-sky-200 px-2 py-1 text-sky-900 dark:bg-sky-800 dark:text-sky-100">
                &apos;0&apos;
              </span>
              <span className="rounded bg-sky-200 px-2 py-1 text-sky-900 dark:bg-sky-800 dark:text-sky-100">
                &apos;0&apos;
              </span>
              <span className="rounded bg-red-300 px-2 py-1 font-bold text-red-950 dark:bg-red-800 dark:text-red-100">
                &apos;\n&apos;
              </span>
            </div>
            <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
              scanf(&quot;%d&quot;) 只读数字，留下 &apos;\n&apos; 未消耗！
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="font-bold text-emerald-800 dark:text-emerald-300">
              3. 解决方案
            </div>
            <p className="mt-2 text-xs font-mono text-emerald-900 dark:text-emerald-200">
              ① getchar(); // 吃掉回车
              <br />② scanf(&quot; %c&quot;, &amp;ch); // 前导空格跳过空白符
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              彻底杜绝后续字符输入被残留回车意外跳过的经典 Bug
            </p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/**
 * 8. 四步闭环学习路线图
 */
export function StudyLoopFigure() {
  const steps = [
    {
      num: "01",
      title: "精读讲义与图解",
      desc: "建立清晰物理内存与控制流模型",
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
    },
    {
      num: "02",
      title: "随堂完成 Quiz",
      desc: "即时自检易错考点与底层语法细节",
      tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
    },
    {
      num: "03",
      title: "运行与调试实验",
      desc: "亲手编写并调试 10 道综合实验源码",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    },
    {
      num: "04",
      title: "攻克 240 题库",
      desc: "针对 10 大考点族归纳陷阱顺利通关",
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    },
  ];

  return (
    <Figure
      title="C 语言“理论 → 测验 → 实验 → 题库”四步闭环学习路线"
      caption="遵循科学的递进闭环：首先理解物理内存底层机理，再通过在线测验和上机调试将语法内化为能力，最后以真实题库实现全面通关。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((st, i) => (
          <div key={st.num} className={`rounded-xl border p-4 ${st.tone}`}>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black opacity-60 font-mono">
                {st.num}
              </span>
              {i < 3 && (
                <ArrowRight className="size-4 opacity-40 hidden lg:block" />
              )}
            </div>
            <div className="mt-3 font-bold text-sm">{st.title}</div>
            <div className="mt-1 text-xs opacity-80 leading-5">{st.desc}</div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/**
 * 9. 循环跳转：break vs continue 控制流走向
 */
export function LoopControlFlowFigure() {
  return (
    <Figure
      title="循环跳转控制流对比：break 彻底跳出 vs continue 提前跳入下一轮"
      caption="遇到 break 时，立即丢弃后续代码并彻底跳出整层循环；遇到 continue 时，仅跳过本轮尚未执行的语句，直接进入下一次步进与条件判断。"
    >
      <div className="grid gap-6 md:grid-cols-2 text-xs">
        {/* break */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
            <span className="font-bold text-red-700 dark:text-red-400 font-mono text-sm">
              break; 彻底跳出
            </span>
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] text-red-800 dark:bg-red-950 dark:text-red-200">
              永久终止
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded bg-white p-2.5 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                1. 判定条件为真
              </div>
              <div className="text-slate-500">
                进入循环体，执行 break 之前的语句
              </div>
            </div>
            <div className="rounded border border-red-400 bg-red-50 p-2.5 font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
              2. 执行 break; 语句 ⚡
            </div>
            <div className="rounded bg-white p-2.5 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-red-600 dark:text-red-400">
                3. 瞬间脱离循环体大括号！
              </div>
              <div className="text-slate-500">
                不再执行后续循环，直接去执行循环外的下一句
              </div>
            </div>
          </div>
        </div>

        {/* continue */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="font-bold text-amber-700 dark:text-amber-400 font-mono text-sm">
              continue; 跳过本次
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              直奔下轮
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded bg-white p-2.5 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                1. 判定条件为真
              </div>
              <div className="text-slate-500">
                进入循环体，执行 continue 之前的语句
              </div>
            </div>
            <div className="rounded border border-amber-400 bg-amber-50 p-2.5 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              2. 执行 continue; 语句 ↷
            </div>
            <div className="rounded bg-white p-2.5 shadow-sm dark:bg-slate-900">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                3. 跳过本次剩余代码，进入下轮！
              </div>
              <div className="text-slate-500">
                对于 for 循环，直接跳到步进表达式（i++）重新判定
              </div>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/**
 * 10. 单词统计二元状态机
 */
export function WordStateMachineFigure() {
  return (
    <Figure
      title="字符串单词统计：基于 word 标志位的二元有限状态机"
      caption="字符串遇到空格将 word 置 0（空格态）；从空格首次遇到非空格字符时，触发单词首字母事件（num++ 并将 word 置 1，进入单词态）。"
    >
      <div className="grid gap-6 md:grid-cols-2 text-xs">
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              状态 A：空格间隔态 (word = 0)
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              词外等待
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-1.5">
              <span className="font-mono text-sky-600 font-bold">•</span>
              <span>
                <strong>遇到空格 &apos; &apos;</strong>：继续保持在状态 A (word
                = 0)。
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-mono text-emerald-600 font-bold">➜</span>
              <span>
                <strong>遇到非空格字母</strong>：发现新单词！
                <strong>num 计数加 1</strong>，跃迁至状态 B (word = 1)。
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
              状态 B：单词内部态 (word = 1)
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              词中读取
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-1.5">
              <span className="font-mono text-emerald-600 font-bold">•</span>
              <span>
                <strong>遇到后续字母</strong>：仍属于当前单词，保持在状态
                B，不重复累加计数。
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-mono text-sky-600 font-bold">➜</span>
              <span>
                <strong>遇到空格 &apos; &apos;</strong>：当前单词结束，返回状态
                A (word = 0)。
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Figure>
  );
}

/**
 * 11. 文件操作四大函数族
 */
export function FileFunctionsTreeFigure() {
  const groups = [
    {
      type: "字符级 I/O",
      funcs: "fgetc() / fputc()",
      desc: "以单一字符为单位读写，读至文件末尾返回 EOF (-1)",
      badge: "单字节流",
    },
    {
      type: "字符串行级 I/O",
      funcs: "fgets() / fputs()",
      desc: "以换行符或缓冲区上限为界整行读写，安全防越界",
      badge: "文本行",
    },
    {
      type: "格式化级 I/O",
      funcs: "fscanf() / fprintf()",
      desc: "按照 %d、%f、%s 等格式控制串进行数据与文本互转",
      badge: "格式化文本",
    },
    {
      type: "二进制数据块 I/O",
      funcs: "fread() / fwrite()",
      desc: "将内存中的结构体或数组按字节块原样读写磁盘",
      badge: "高效原样搬运",
    },
  ];

  return (
    <Figure
      title="C 语言标准库文件读写四大函数族全景架构"
      caption="根据读写粒度与数据类型选择最恰当的函数：逐字读写用 fgetc/fputc，行读写用 fgets/fputs，数据字段用 fscanf/fprintf，结构体批量存储用 fread/fwrite。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div
            key={g.type}
            className="rounded-xl border border-sky-500/20 bg-white p-4 shadow-sm dark:bg-[#1a2333]"
          >
            <div className="flex items-center justify-between border-b border-sky-500/15 pb-2 text-xs">
              <span className="font-semibold text-sky-700 dark:text-sky-300">
                {g.type}
              </span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                {g.badge}
              </span>
            </div>
            <div className="mt-2.5 font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
              {g.funcs}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {g.desc}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  );
}
