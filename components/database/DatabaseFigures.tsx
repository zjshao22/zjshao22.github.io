import type { ReactNode } from "react";
import {
  ArrowRight,
  Database,
  Key,
  Layers,
  Link as LinkIcon,
  Server,
  Shield,
  Table,
  User,
  BookOpen,
  GraduationCap,
  ClipboardList,
  HardDrive,
  Network,
  Terminal,
  FileText,
  Boxes,
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
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border border-indigo-900/15 bg-[#f5f6fa] text-slate-900 shadow-[0_14px_38px_-30px_rgba(30,41,59,0.35)] dark:border-indigo-100/15 dark:bg-[#151824] dark:text-slate-100">
      <div className="border-b border-indigo-900/10 px-5 py-4 dark:border-indigo-100/10 sm:px-6">
        <p className="text-xs font-bold tracking-[0.17em] text-indigo-700 dark:text-indigo-300">
          DATABASE MODEL / 数据库模型与原理
        </p>
        <figcaption className="mt-1 text-lg font-bold">{title}</figcaption>
      </div>
      <div className="px-5 py-6 sm:px-6">{children}</div>
      <p className="border-t border-indigo-900/10 px-5 py-3 text-sm leading-6 text-slate-600 dark:border-indigo-100/10 dark:text-slate-300 sm:px-6">
        {caption}
      </p>
    </figure>
  );
}

export function FourTableSchemaFigure() {
  return (
    <Figure
      title="教学主线：四张业务表的关联结构"
      caption="学生表与课程表通过选课表建立多对多联系（选课表采用联合主键 sid + cid）；教师表与课程表通过工号 tid 建立一对多联系。"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* t_student */}
        <div className="rounded-xl border border-indigo-500/25 bg-white p-4 shadow-sm dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-2">
            <GraduationCap className="size-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold">t_student</span>
            <span className="ml-auto text-xs text-slate-500">学生实体表</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center justify-between font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="flex items-center gap-1">
                <Key className="size-3 text-amber-500" /> sid (学号)
              </span>
              <span className="text-[10px] uppercase text-slate-400">PK</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>sname (姓名)</span>
              <span className="text-[10px] text-slate-400">VARCHAR</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>sex (性别)</span>
              <span className="text-[10px] text-slate-400">CHAR(1)</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>age (年龄)</span>
              <span className="text-[10px] text-slate-400">INT</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>major (专业)</span>
              <span className="text-[10px] text-slate-400">VARCHAR (可空)</span>
            </li>
          </ul>
        </div>

        {/* t_teacher */}
        <div className="rounded-xl border border-emerald-500/25 bg-white p-4 shadow-sm dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 border-b border-emerald-500/15 pb-2">
            <User className="size-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">t_teacher</span>
            <span className="ml-auto text-xs text-slate-500">教师实体表</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1">
                <Key className="size-3 text-amber-500" /> tid (工号)
              </span>
              <span className="text-[10px] uppercase text-slate-400">PK</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>tname (姓名)</span>
              <span className="text-[10px] text-slate-400">VARCHAR</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>age (年龄)</span>
              <span className="text-[10px] text-slate-400">INT</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>title (职称)</span>
              <span className="text-[10px] text-slate-400">VARCHAR</span>
            </li>
          </ul>
        </div>

        {/* t_course */}
        <div className="rounded-xl border border-sky-500/25 bg-white p-4 shadow-sm dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 border-b border-sky-500/15 pb-2">
            <BookOpen className="size-5 text-sky-600 dark:text-sky-400" />
            <span className="font-bold">t_course</span>
            <span className="ml-auto text-xs text-slate-500">课程实体表</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center justify-between font-semibold text-sky-700 dark:text-sky-300">
              <span className="flex items-center gap-1">
                <Key className="size-3 text-amber-500" /> cid (课程号)
              </span>
              <span className="text-[10px] uppercase text-slate-400">PK</span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>cname (课程名)</span>
              <span className="text-[10px] text-slate-400">VARCHAR</span>
            </li>
            <li className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1">
                <LinkIcon className="size-3" /> tid (任课教师)
              </span>
              <span className="text-[10px] text-slate-400">
                FK $\to$ t_teacher
              </span>
            </li>
          </ul>
        </div>

        {/* t_student_course */}
        <div className="rounded-xl border border-amber-500/35 bg-white p-4 shadow-sm dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 border-b border-amber-500/15 pb-2">
            <ClipboardList className="size-5 text-amber-600 dark:text-amber-400" />
            <span className="font-bold">t_student_course</span>
            <span className="ml-auto text-xs text-slate-500">选课联系表</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Key className="size-3 text-amber-500" />
                <LinkIcon className="size-3 text-indigo-500" /> sid (学号)
              </span>
              <span className="text-[10px] text-slate-400">
                PK / FK $\to$ t_student
              </span>
            </li>
            <li className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Key className="size-3 text-amber-500" />
                <LinkIcon className="size-3 text-sky-500" /> cid (课程号)
              </span>
              <span className="text-[10px] text-slate-400">
                PK / FK $\to$ t_course
              </span>
            </li>
            <li className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>score (成绩)</span>
              <span className="text-[10px] text-slate-400">
                DECIMAL/INT (联系属性)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Figure>
  );
}

export function SqlOrderFigure() {
  const steps = [
    { name: "FROM", desc: "确定基表与笛卡尔积", tag: "第 1 步" },
    { name: "ON / JOIN", desc: "按连接键过滤与补齐外连接行", tag: "第 2 步" },
    { name: "WHERE", desc: "基于单行条件过滤数据行", tag: "第 3 步" },
    { name: "GROUP BY", desc: "按指定列进行分组聚合", tag: "第 4 步" },
    { name: "HAVING", desc: "基于聚合结果过滤分组", tag: "第 5 步" },
    { name: "SELECT", desc: "计算表达式并输出指定投影列", tag: "第 6 步" },
    { name: "DISTINCT", desc: "对结果集进行行去重", tag: "第 7 步" },
    { name: "ORDER BY", desc: "按指定规则进行排序", tag: "第 8 步" },
    { name: "LIMIT", desc: "截取最终返回的记录窗口", tag: "第 9 步" },
  ];

  return (
    <Figure
      title="SQL 查询的逻辑执行生命周期"
      caption="书写顺序与执行顺序不同：WHERE 发生在分组前，不能使用聚合函数；HAVING 发生在分组后；SELECT 投影晚于 WHERE，因此 WHERE 中不可使用列别名。"
    >
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
        {steps.map((s, i) => (
          <div
            key={s.name}
            className="flex flex-col rounded-lg border border-indigo-500/20 bg-white p-2.5 text-center shadow-xs dark:bg-[#1a1f30]"
          >
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {s.tag}
            </span>
            <span className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">
              {s.name}
            </span>
            <span className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              {s.desc}
            </span>
          </div>
        ))}
      </div>
    </Figure>
  );
}

export function NormalizationFlowFigure() {
  return (
    <Figure
      title="关系模式规范化阶梯：从非规范到 BCNF"
      caption="规范化的核心是通过模式分解消除不良函数依赖，从而消除插入异常、删除异常和更新异常，降低数据冗余。"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="flex-1 rounded-xl border border-slate-300/80 bg-white p-4 dark:border-slate-700 dark:bg-[#1a1f30]">
          <div className="text-xs font-bold text-slate-500">
            第 1 范式 (1NF)
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            属性原子性
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            每个字段都是不可再分的最小数据项，表中不能包含集合或子表。
          </p>
        </div>

        <div className="flex items-center justify-center text-slate-400">
          <ArrowRight className="size-5 rotate-90 md:rotate-0" />
        </div>

        <div className="flex-1 rounded-xl border border-sky-400/80 bg-white p-4 dark:border-sky-700 dark:bg-[#1a1f30]">
          <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
            第 2 范式 (2NF)
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            消除部分函数依赖
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            满足 1NF 且非主属性完全函数依赖于整个候选键（单属性主键自然满足
            2NF）。
          </p>
        </div>

        <div className="flex items-center justify-center text-slate-400">
          <ArrowRight className="size-5 rotate-90 md:rotate-0" />
        </div>

        <div className="flex-1 rounded-xl border border-indigo-500/80 bg-white p-4 dark:border-indigo-700 dark:bg-[#1a1f30]">
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            第 3 范式 (3NF)
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            消除传递函数依赖
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            满足 2NF
            且非主属性之间不存在依赖传递（非主属性不决定另一个非主属性）。
          </p>
        </div>

        <div className="flex items-center justify-center text-slate-400">
          <ArrowRight className="size-5 rotate-90 md:rotate-0" />
        </div>

        <div className="flex-1 rounded-xl border border-emerald-500/80 bg-white p-4 dark:border-emerald-700 dark:bg-[#1a1f30]">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            BC 范式 (BCNF)
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            决定因素必为候选键
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            消除了主属性对候选键的部分与传递依赖，每个决定属性组都必须包含候选键。
          </p>
        </div>
      </div>
    </Figure>
  );
}

export function AcidTransactionFigure() {
  return (
    <Figure
      title="数据库事务的 ACID 特性与提交/回滚机制"
      caption="事务是一组不可分割的逻辑操作单元。通过 COMMIT 将修改永久写入存储，或遇到异常时通过 ROLLBACK 恢复初始状态。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-indigo-500/20 bg-white p-3.5 dark:bg-[#1a1f30]">
          <div className="font-bold text-indigo-600 dark:text-indigo-400">
            A · 原子性 (Atomicity)
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            事务中的所有 SQL 要么全部成功生效，要么全部撤销，如同从未执行。
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-white p-3.5 dark:bg-[#1a1f30]">
          <div className="font-bold text-emerald-600 dark:text-emerald-400">
            C · 一致性 (Consistency)
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            事务执行前后，数据库都必须满足预定的完整性约束（如外键、唯一、非空等）。
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-white p-3.5 dark:bg-[#1a1f30]">
          <div className="font-bold text-amber-600 dark:text-amber-400">
            I · 隔离性 (Isolation)
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            并发执行的事务之间互不干扰，通过隔离级别与锁机制防范脏读、不可重复读和幻读。
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-white p-3.5 dark:bg-[#1a1f30]">
          <div className="font-bold text-sky-600 dark:text-sky-400">
            D · 持久性 (Durability)
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            一旦事务 COMMIT
            提交，其对数据库数据的修改将永久保存在磁盘，崩溃不丢失。
          </p>
        </div>
      </div>
    </Figure>
  );
}

export function AppArchitectureFigure() {
  return (
    <Figure
      title="实验四：成绩管理系统端到端架构与数据范围隔离"
      caption="教师端通过身份验证换取教师工号 tid；后端服务在执行任何增删查改时均强绑定该工号，防止越权访问其他教师的任课数据。"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex-1 rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2">
            <User className="size-4 text-indigo-600" />
            <span className="font-bold text-sm">任课教师客户端</span>
          </div>
          <ul className="mt-2.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>• 登录界面输入教师工号与密码</li>
            <li>• 仅能查看本人承担的课程列表</li>
            <li>• 为本课学生添加选课 / 删选课</li>
            <li>• 录入未登分成绩 / 修改已有成绩</li>
          </ul>
        </div>

        <div className="flex items-center justify-center text-slate-400">
          <ArrowRight className="size-5 rotate-90 sm:rotate-0" />
        </div>

        <div className="flex-1 rounded-xl border border-indigo-400 bg-white p-4 dark:border-indigo-700 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-indigo-600" />
            <span className="font-bold text-sm">应用服务层 (参数化 SQL)</span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            统一注入上下文{" "}
            <code className="text-indigo-600">WHERE t_course.tid = ?</code>
            。所有数据库操作使用参数化预编译查询，杜绝 SQL 注入漏洞与越权查询。
          </p>
        </div>

        <div className="flex items-center justify-center text-slate-400">
          <ArrowRight className="size-5 rotate-90 sm:rotate-0" />
        </div>

        <div className="flex-1 rounded-xl border border-emerald-400 bg-white p-4 dark:border-emerald-700 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-emerald-600" />
            <span className="font-bold text-sm">MySQL 数据库引擎</span>
          </div>
          <ul className="mt-2.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>
              • <code className="font-mono text-[11px]">teachingdb_***</code>{" "}
              业务库
            </li>
            <li>• 执行约束校验 (主外键参照完整性)</li>
            <li>• 事务一致性提交并返回结果行</li>
          </ul>
        </div>
      </div>
    </Figure>
  );
}

export function WorkbenchSchemaFigure() {
  return (
    <Figure
      title="软件界面：MySQL Workbench 创建数据库 (Schema) 窗口"
      caption="在 Workbench 顶部导航点击新建 Schema 图标，设置 Name 为 teachingdb_chen，Charset 为 utf8mb4，Collation 为 utf8mb4_0900_ai_ci，点击 Apply 执行。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1a1f30]">
        {/* Window Title Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-amber-400" />
            <span className="size-3 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              MySQL Workbench - [new_schema - Schema]
            </span>
          </div>
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            Workbench 8.0 CE
          </span>
        </div>

        {/* Form Body */}
        <div className="p-5 text-xs text-slate-700 dark:text-slate-300">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Schema Name (数据库名):
              </label>
              <div className="mt-1.5 flex items-center rounded-md border border-indigo-500 bg-indigo-50/50 px-3 py-1.5 font-mono font-bold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                teachingdb_chen
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Default Charset (默认字符集):
              </label>
              <div className="mt-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                utf8mb4
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Default Collation (排序规则):
              </label>
              <div className="mt-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                utf8mb4_0900_ai_ci
              </div>
            </div>
            <div className="flex items-end">
              <span className="text-[11px] text-slate-500">
                * 确保支持完整 Emoji 与四字节 Unicode 字符
              </span>
            </div>
          </div>

          {/* DDL Preview Dialog */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-[11px] font-bold text-slate-500">
              Apply SQL Script to Database (生成的 DDL 预览):
            </div>
            <pre className="mt-1.5 font-mono text-xs text-indigo-700 dark:text-indigo-300">
              CREATE SCHEMA `teachingdb_chen` DEFAULT CHARACTER SET utf8mb4
              COLLATE utf8mb4_0900_ai_ci;
            </pre>
          </div>

          {/* Dialog Action Buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Revert (重置)
            </button>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-4 py-1 font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              Apply (应用执行)
            </button>
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function WorkbenchTableEditorFigure() {
  return (
    <Figure
      title="软件界面：MySQL Workbench 可视化表设计器 (Table Editor)"
      caption="以选课表 t_student_course 为例：sid 与 cid 均勾选 PK（主键）与 NN（非空），形成复合联合主键；下方面板通过 Foreign Keys 选项卡分别引用 t_student 与 t_course。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1a1f30]">
        {/* Table Tab Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Table className="size-4 text-amber-500" />
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              teachingdb_chen.t_student_course - Table
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Engine: InnoDB | Collation: utf8mb4
          </span>
        </div>

        {/* Columns Grid */}
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <th className="pb-2 font-bold">Column Name</th>
                <th className="pb-2 font-bold">Datatype</th>
                <th className="pb-2 text-center font-bold">PK</th>
                <th className="pb-2 text-center font-bold">NN</th>
                <th className="pb-2 text-center font-bold">UQ</th>
                <th className="pb-2 text-center font-bold">BIN</th>
                <th className="pb-2 text-center font-bold">AI</th>
                <th className="pb-2 font-bold">Constraints / References</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                <td className="py-2.5 font-bold text-amber-800 dark:text-amber-300">
                  sid
                </td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">
                  VARCHAR(20)
                </td>
                <td className="py-2.5 text-center font-bold text-amber-600">
                  ☑
                </td>
                <td className="py-2.5 text-center font-bold text-indigo-600">
                  ☑
                </td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                  FK $\to$ t_student(sid)
                </td>
              </tr>
              <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                <td className="py-2.5 font-bold text-amber-800 dark:text-amber-300">
                  cid
                </td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">
                  VARCHAR(20)
                </td>
                <td className="py-2.5 text-center font-bold text-amber-600">
                  ☑
                </td>
                <td className="py-2.5 text-center font-bold text-indigo-600">
                  ☑
                </td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                  FK $\to$ t_course(cid)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-700 dark:text-slate-300">
                  score
                </td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">
                  DECIMAL(5,2)
                </td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-center text-slate-400">☐</td>
                <td className="py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                  CHECK (score &gt;= 0 AND score &lt;= 100)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lower Tabs Strip */}
        <div className="flex border-t border-slate-200 bg-slate-50 px-4 text-xs dark:border-slate-800 dark:bg-slate-900/60">
          <span className="border-b-2 border-indigo-600 px-3 py-2 font-bold text-indigo-600 dark:text-indigo-400">
            Columns (字段列表)
          </span>
          <span className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Indexes (索引)
          </span>
          <span className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
            Foreign Keys (外键配置: fk_sc_student, fk_sc_course)
          </span>
          <span className="px-3 py-2 text-slate-500">Triggers</span>
        </div>
      </div>
    </Figure>
  );
}

export function WorkbenchSingleQueryFigure() {
  return (
    <Figure
      title="软件界面：MySQL Workbench 单表查询执行与结果网格 (Result Grid)"
      caption="执行实验一查询 5：条件筛选 title = '副教授' 且 age BETWEEN 30 AND 35，ORDER BY age DESC 降序排列。结果网格清晰展示 4 位符合条件的教师。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1a1f30]">
        {/* Editor Toolbar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300"
          >
            ⚡ Execute (执行当前语句)
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs text-slate-500">Limit to 1000 rows</span>
          <span className="ml-auto text-xs font-mono text-emerald-600 dark:text-emerald-400">
            ● Connected: root@localhost:3306
          </span>
        </div>

        {/* SQL Code Pane */}
        <div className="border-b border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100 dark:border-slate-800">
          <div className="text-slate-400">
            -- 实验一 题 5：查询年龄在 30 到 35
            岁之间的副教授的姓名和年龄，按年龄降序排列
          </div>
          <div className="mt-1 text-sky-300">
            SELECT <span className="text-white">tname, age</span>
          </div>
          <div className="text-sky-300">
            FROM <span className="text-white">t_teacher</span>
          </div>
          <div className="text-sky-300">
            WHERE <span className="text-white">title = </span>
            <span className="text-amber-300">&apos;副教授&apos;</span>
            <span className="text-sky-300"> AND </span>
            <span className="text-white">age BETWEEN </span>
            <span className="text-purple-300">30</span>
            <span className="text-sky-300"> AND </span>
            <span className="text-purple-300">35</span>
          </div>
          <div className="text-sky-300">
            ORDER BY <span className="text-white">age DESC</span>;
          </div>
        </div>

        {/* Result Grid */}
        <div className="p-3 text-xs">
          <div className="flex items-center justify-between pb-1.5 text-slate-500">
            <span className="font-bold">Result Grid (结果网格):</span>
            <span className="font-mono text-[11px]">
              4 row(s) returned in 0.001 sec
            </span>
          </div>
          <table className="w-full border-collapse border border-slate-200 font-mono text-xs dark:border-slate-800">
            <thead>
              <tr className="bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                  tname
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-right dark:border-slate-700">
                  age
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  刘红
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  35
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  王海
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  34
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  张雷
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  33
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  韩伟
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  32
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Output Console */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-[10px]">
            ✓
          </span>
          <span>14:28:10</span>
          <span className="truncate text-slate-800 dark:text-slate-200">
            {"SELECT tname, age FROM t_teacher WHERE title = '副教授'..."}
          </span>
          <span className="ml-auto shrink-0 font-bold text-emerald-600">
            4 row(s) returned
          </span>
        </div>
      </div>
    </Figure>
  );
}

export function WorkbenchQueryGridFigure() {
  return (
    <Figure
      title="软件界面：MySQL Workbench SQL 编辑器与结果网格 (Result Grid)"
      caption="执行实验一查询 8（李平同学所选课程及成绩）：上部为 SQL 代码编辑区与闪电执行按钮；中部为 Result Grid 表格视图；下部 Action Output 控制台显示绿色对勾与返回行数。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1a1f30]">
        {/* Editor Toolbar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300"
          >
            ⚡ Execute (执行当前语句)
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs text-slate-500">Limit to 1000 rows</span>
          <span className="ml-auto text-xs font-mono text-emerald-600 dark:text-emerald-400">
            ● Connected: root@localhost:3306
          </span>
        </div>

        {/* SQL Code Pane */}
        <div className="border-b border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100 dark:border-slate-800">
          <div className="text-slate-400">
            -- 实验一 题 8：查询李平同学所选修课程的课程号、课程名和成绩
          </div>
          <div className="mt-1 text-sky-300">
            SELECT <span className="text-white">c.cid, c.cname, sc.score</span>
          </div>
          <div className="text-sky-300">
            FROM <span className="text-white">t_student s</span>
          </div>
          <div className="text-sky-300">
            JOIN <span className="text-white">t_student_course sc</span> ON{" "}
            <span className="text-white">s.sid = sc.sid</span>
          </div>
          <div className="text-sky-300">
            JOIN <span className="text-white">t_course c</span> ON{" "}
            <span className="text-white">sc.cid = c.cid</span>
          </div>
          <div className="text-sky-300">
            WHERE <span className="text-white">s.sname = </span>
            <span className="text-amber-300">&apos;李平&apos;</span>;
          </div>
        </div>

        {/* Result Grid */}
        <div className="p-3 text-xs">
          <div className="flex items-center justify-between pb-1.5 text-slate-500">
            <span className="font-bold">Result Grid (结果网格):</span>
            <span className="font-mono text-[11px]">
              2 row(s) returned in 0.002 sec
            </span>
          </div>
          <table className="w-full border-collapse border border-slate-200 font-mono text-xs dark:border-slate-800">
            <thead>
              <tr className="bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                  cid
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                  cname
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-right dark:border-slate-700">
                  score
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  c003
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  软件测试
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  70.00
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                  c008
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-slate-800 dark:border-slate-700 dark:text-slate-200">
                  计算机基础
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-emerald-600 dark:border-slate-700">
                  88.00
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Output Console */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-[10px]">
            ✓
          </span>
          <span>15:42:01</span>
          <span className="truncate text-slate-800 dark:text-slate-200">
            SELECT c.cid, c.cname, sc.score FROM t_student s JOIN...
          </span>
          <span className="ml-auto shrink-0 font-bold text-emerald-600">
            2 row(s) returned
          </span>
        </div>
      </div>
    </Figure>
  );
}

export function TerminalBackupRestoreFigure() {
  return (
    <Figure
      title="软件界面：系统终端 mysqldump 与 mysql 命令备份恢复"
      caption="在操作系统命令行中，使用 mysqldump 将表数据导出为纯文本 SQL 脚本；清空表后通过 mysql 命令直接回放脚本完成快速还原。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0f141c] font-mono text-xs text-slate-200 shadow-sm">
        {/* Terminal Header */}
        <div className="flex items-center border-b border-slate-800 bg-[#161c26] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500" />
            <span className="size-3 rounded-full bg-amber-500" />
            <span className="size-3 rounded-full bg-emerald-500" />
            <span className="ml-2 text-xs text-slate-400">
              Terminal — bash — 80×24
            </span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="space-y-2 p-4">
          <div>
            <span className="text-emerald-400">student@host:~$</span>{" "}
            <span className="font-bold text-white">
              mysqldump -u root -p teachingdb_chen t_student_course &gt;
              Dump_sc.sql
            </span>
          </div>
          <div className="text-slate-400">
            Enter password: <span className="text-slate-600">******</span>
          </div>
          <div className="text-slate-400">
            # 导出完成，生成包含建表结构与 INSERT 语句的 Dump_sc.sql 文件
          </div>

          <div className="pt-2">
            <span className="text-emerald-400">student@host:~$</span>{" "}
            <span className="font-bold text-white">
              {
                'mysql -u root -p teachingdb_chen -e "DELETE FROM t_student_course;"'
              }
            </span>
          </div>
          <div className="text-slate-400">
            Enter password: <span className="text-slate-600">******</span>
          </div>
          <div className="text-amber-400">
            # 模拟灾难：t_student_course 数据已被清空 (24 rows affected)
          </div>

          <div className="pt-2">
            <span className="text-emerald-400">student@host:~$</span>{" "}
            <span className="font-bold text-white">
              mysql -u root -p teachingdb_chen &lt; Dump_sc.sql
            </span>
          </div>
          <div className="text-slate-400">
            Enter password: <span className="text-slate-600">******</span>
          </div>

          <div className="pt-2">
            <span className="text-emerald-400">student@host:~$</span>{" "}
            <span className="font-bold text-white">
              {
                'mysql -u root -p teachingdb_chen -e "SELECT COUNT(*) FROM t_student_course;"'
              }
            </span>
          </div>
          <div className="text-slate-400">
            Enter password: <span className="text-slate-600">******</span>
          </div>
          <div className="text-emerald-300">
            +----------+
            <br />
            | COUNT(*) |<br />
            +----------+
            <br />
            | 24 |<br />
            +----------+
            <br />1 row in set (0.001 sec)
          </div>
          <div className="text-emerald-400">
            # 验证通过：24 行选课记录全部完好还原！
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function TerminalSecurityGrantFigure() {
  return (
    <Figure
      title="软件界面：以新用户 tuser 登录并检验权限边界拦截"
      caption="验证细粒度授权：tuser 访问拥有 SELECT 权限的 teachingdb2.t_student 成功返回数据；当尝试越权访问未授权的 t_course 时，被 MySQL 精确拦截报错。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0f141c] font-mono text-xs text-slate-200 shadow-sm">
        {/* Terminal Header */}
        <div className="flex items-center border-b border-slate-800 bg-[#161c26] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500" />
            <span className="size-3 rounded-full bg-amber-500" />
            <span className="size-3 rounded-full bg-emerald-500" />
            <span className="ml-2 text-xs text-slate-400">
              Terminal — mysql client session — 80×24
            </span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="space-y-2 p-4">
          <div>
            <span className="text-emerald-400">student@host:~$</span>{" "}
            <span className="font-bold text-white">mysql -u tuser -p</span>
          </div>
          <div className="text-slate-400">
            Enter password: <span className="text-slate-600">******</span>{" "}
            (密码: 111111)
          </div>
          <div className="text-slate-300">
            Welcome to the MySQL monitor. Commands end with ; or \g.
            <br />
            Server version: 8.0.36 MySQL Community Server - GPL
          </div>

          <div className="pt-2">
            <span className="text-sky-400">mysql&gt;</span>{" "}
            <span className="font-bold text-white">
              SELECT sid, sname FROM teachingdb2.t_student LIMIT 2;
            </span>
          </div>
          <div className="text-emerald-300">
            +---------+--------+
            <br />
            | sid | sname |<br />
            +---------+--------+
            <br />
            | 2012001 | 王珊 |<br />
            | 2012002 | 李平 |<br />
            +---------+--------+
            <br />2 rows in set (0.001 sec)
          </div>

          <div className="pt-2">
            <span className="text-sky-400">mysql&gt;</span>{" "}
            <span className="font-bold text-white">
              SELECT * FROM teachingdb2.t_course;
            </span>
          </div>
          <div className="rounded bg-rose-950/50 p-2 text-rose-300 border border-rose-800/60">
            {
              "ERROR 1142 (42000): SELECT command denied to user 'tuser'@'localhost' for table 't_course'"
            }
          </div>
          <div className="text-emerald-400">
            # 验证通过：有权操作放行，越权操作被成功拦截！
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function AppGradeSystemFigure() {
  return (
    <Figure
      title="软件界面：实验四 学生成绩管理系统 Web 客户端界面"
      caption="系统用户为任课教师：李明老师（t001）登录后，系统强制隔离仅展示其承担的课程与学生选课记录；支持录入成绩、修改成绩与选课维护。"
    >
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1a1f30]">
        {/* Browser Frame */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-amber-400" />
          <span className="size-3 rounded-full bg-emerald-400" />
          <div className="ml-2 flex-1 rounded bg-white px-3 py-1 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            http://localhost:3000/grades
          </div>
        </div>

        {/* Web App Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-indigo-100 bg-indigo-50/50 px-5 py-3 dark:border-indigo-950 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
              校园教务 · 教师成绩管理系统
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-medium text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
              当前教师：李明 (工号: t001 · 副教授)
            </span>
            <button type="button" className="text-slate-500 hover:text-red-600">
              注销退出
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 text-xs dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              选择主讲课程：
            </span>
            <div className="rounded border border-indigo-300 bg-white px-2.5 py-1 font-semibold text-indigo-700 dark:bg-slate-800 dark:text-indigo-300">
              数据库 (c001) ▼
            </div>
            <span className="text-slate-400">| 本课选修总人数：4 人</span>
          </div>
          <button
            type="button"
            className="rounded bg-indigo-600 px-3 py-1 font-bold text-white hover:bg-indigo-700"
          >
            + 为本课添加选课
          </button>
        </div>

        {/* Student Table */}
        <div className="p-4 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 pb-2 text-slate-500 dark:border-slate-700">
                <th className="pb-2 font-bold">学号</th>
                <th className="pb-2 font-bold">姓名</th>
                <th className="pb-2 font-bold">性别</th>
                <th className="pb-2 font-bold">院系专业</th>
                <th className="pb-2 font-bold">平时/期末成绩</th>
                <th className="pb-2 font-bold">状态</th>
                <th className="pb-2 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr>
                <td className="py-2.5">2012001</td>
                <td className="font-sans font-semibold">王珊</td>
                <td>女</td>
                <td>软件工程</td>
                <td>
                  <span className="font-bold text-emerald-600">87.00</span>
                </td>
                <td>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                    已登分
                  </span>
                </td>
                <td className="text-right font-sans">
                  <button
                    type="button"
                    className="text-indigo-600 hover:underline mr-2"
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                  >
                    退选
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2.5">2012003</td>
                <td className="font-sans font-semibold">张华</td>
                <td>男</td>
                <td>机械电子</td>
                <td>
                  <span className="font-bold text-emerald-600">90.00</span>
                </td>
                <td>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                    已登分
                  </span>
                </td>
                <td className="text-right font-sans">
                  <button
                    type="button"
                    className="text-indigo-600 hover:underline mr-2"
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                  >
                    退选
                  </button>
                </td>
              </tr>
              <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                <td className="py-2.5">2012005</td>
                <td className="font-sans font-semibold">李勇</td>
                <td>男</td>
                <td>机械电子</td>
                <td>
                  <span className="font-bold text-amber-600">
                    NULL (待录入)
                  </span>
                </td>
                <td>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                    未登分
                  </span>
                </td>
                <td className="text-right font-sans">
                  <button
                    type="button"
                    className="font-bold text-indigo-600 hover:underline mr-2"
                  >
                    录入成绩
                  </button>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                  >
                    退选
                  </button>
                </td>
              </tr>
              <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                <td className="py-2.5">2013005</td>
                <td className="font-sans font-semibold">李华</td>
                <td>女</td>
                <td>软件工程</td>
                <td>
                  <span className="font-bold text-amber-600">
                    NULL (待录入)
                  </span>
                </td>
                <td>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                    未登分
                  </span>
                </td>
                <td className="text-right font-sans">
                  <button
                    type="button"
                    className="font-bold text-indigo-600 hover:underline mr-2"
                  >
                    录入成绩
                  </button>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                  >
                    退选
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Figure>
  );
}

export function GateChainFigure() {
  const gates = [
    {
      id: "G1",
      name: "基础操作",
      pos: "第 1 章",
      desc: "建表与增删改，完整性约束",
    },
    {
      id: "G2",
      name: "综合查询",
      pos: "第 2~3 章",
      desc: "单表、多表连接、分组与子查询",
    },
    {
      id: "G3",
      name: "数据库设计",
      pos: "第 4 章",
      desc: "ER 建模、转表与 1NF~3NF 规范化",
    },
    {
      id: "G4",
      name: "管理与应用",
      pos: "第 6~7 章",
      desc: "备份恢复、权限控制与成绩系统",
    },
    {
      id: "G5",
      name: "综合迁移",
      pos: "第 8 章",
      desc: "综合场景演练、题型精选自测与迁移",
    },
  ];

  return (
    <Figure
      title="阶段能力达成检查点（Gate 1 至 Gate 5）"
      caption="五个阶段性能力检查点贯穿全课程，从基础建表、综合查询、系统设计、管理应用到机考迁移，形成递进的能力阶梯。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {gates.map((g, idx) => (
          <div
            key={g.id}
            className="flex flex-col justify-between rounded-xl border border-indigo-500/20 bg-white p-3.5 shadow-xs dark:bg-[#1a1f30]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {g.id}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {g.pos}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {g.name}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {g.desc}
              </p>
            </div>
            {idx < gates.length - 1 && (
              <div className="mt-3 hidden items-center justify-end text-indigo-400 lg:flex">
                <ArrowRight className="size-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Figure>
  );
}

export function DbsComponentsFigure() {
  return (
    <Figure
      title="数据库系统 (DBS) 的四大核心构成要素"
      caption="DBS 是一个综合体系：DB 是数据集合，DBMS 是管理软件核心，DBAS 是上层业务应用，DBA 与终端用户是系统的操作与管理主体。"
    >
      <div className="rounded-xl border border-indigo-500/20 bg-white p-5 shadow-xs dark:bg-[#1a1f30]">
        <div className="text-center font-bold text-sm text-indigo-700 dark:text-indigo-300">
          数据库系统 (DBS, DataBase System)
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <HardDrive className="size-4 text-sky-500" />
              数据库 (DB)
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              长期存储在磁盘上的、有组织的、可共享的大量数据集合。
            </p>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-300 text-xs">
              <Server className="size-4 text-indigo-500" />
              管理系统 (DBMS)
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              核心系统软件（如 MySQL Server），负责定义、操纵、并发与容灾。
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Boxes className="size-4 text-emerald-500" />
              应用系统 (DBAS)
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              在 DBMS 基础上开发的业务软件、Web
              前后端及管理客户端（Workbench）。
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <User className="size-4 text-amber-500" />
              DBA 与各类用户
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              数据库管理员 (DBA)、系统分析员、应用开发程序员及最终业务终端用户。
            </p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function ThreeSchemaFigure() {
  return (
    <Figure
      title="数据库三级模式与二级映象体系结构"
      caption="三级模式通过外模式/模式映象保障逻辑数据独立性（模式改变时外模式可保持稳定），通过模式/内模式映象保障物理数据独立性（物理存储与索引改变时逻辑模式不受影响）。"
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-sky-400/40 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-sky-900 dark:text-sky-200">
              外模式 / 子模式 (External Schema / View)
            </span>
            <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
              面向用户与具体应用
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            某个具体用户或应用程序能看到和使用的局部数据的逻辑结构描述（如学生端视图、教师端成绩视图）。
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <ArrowRight className="size-3.5 rotate-90" />
          <span>外模式 / 模式映象（保证逻辑数据独立性）</span>
          <ArrowRight className="size-3.5 rotate-90" />
        </div>

        <div className="rounded-xl border border-indigo-400/40 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
              模式 / 概念模式 (Conceptual Schema)
            </span>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
              全局逻辑视图
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            全体数据的全局逻辑结构与完整性约束定义（如全部 4
            张实体联系表、所有字段定义与主外键规则）。一个数据库只有一个模式。
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <ArrowRight className="size-3.5 rotate-90" />
          <span>模式 / 内模式映象（保证物理数据独立性）</span>
          <ArrowRight className="size-3.5 rotate-90" />
        </div>

        <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              内模式 / 存储模式 (Internal Schema)
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              面向底层物理存储
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            数据在物理介质上的实际存储组织方式（如 InnoDB 数据页、B+
            树聚簇索引、存储压缩与行格式）。一个数据库只有一个内模式。
          </p>
        </div>
      </div>
    </Figure>
  );
}

export function ClientServerArchitectureFigure() {
  return (
    <Figure
      title="MySQL 客户端 / 服务端 (C/S) 体系架构与通信"
      caption="Workbench 与系统终端作为客户端发送 SQL 请求；通过 TCP/IP 协议（默认端口 3306）或本地 Unix 套接字与 MySQL Server (mysqld) 交互并接收执行结果。"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400">
            <Terminal className="size-4" /> 客户端层 (Client)
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>• MySQL Workbench（图形化工具）</li>
            <li>• mysql 命令行终端客户端</li>
            <li>• 外部应用程序（Node.js / Python 驱动）</li>
          </ul>
        </div>

        <div className="flex flex-col items-center justify-center text-slate-400 px-2">
          <Network className="size-5 text-indigo-500" />
          <span className="text-[10px] font-mono mt-1 text-indigo-600 dark:text-indigo-400 font-bold">
            TCP/IP 3306 / 套接字
          </span>
          <ArrowRight className="size-4 rotate-90 md:rotate-0 text-slate-400 mt-1" />
        </div>

        <div className="flex-1 rounded-xl border border-indigo-400/30 bg-indigo-50/30 p-4 dark:border-indigo-900/40 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-300">
            <Server className="size-4" /> 服务端核心 (mysqld)
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>• 连接池与线程管理器</li>
            <li>• SQL 解析器、优化器与缓存</li>
            <li>• 存储引擎层（InnoDB 读写引擎）</li>
          </ul>
        </div>
      </div>
    </Figure>
  );
}

export function IntegrityConstraintsFigure() {
  return (
    <Figure
      title="关系数据模型的三类完整性约束体系"
      caption="DBMS 自动维护这三类约束：主键保障实体唯一可寻址，外键保障关联引用有效性，CHECK 等用户定义规则保障业务数值合法。"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-400/30 bg-white p-4 dark:border-indigo-900/40 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-300">
            <Key className="size-4 text-amber-500" />
            1. 实体完整性
          </div>
          <div className="mt-2 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
            PRIMARY KEY
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            主键属性值必须全局唯一，且绝对不能取 NULL
            空值。确保每条元组可唯一寻址。
          </p>
        </div>

        <div className="rounded-xl border border-sky-400/30 bg-white p-4 dark:border-sky-900/40 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-xs text-sky-700 dark:text-sky-300">
            <LinkIcon className="size-4 text-sky-500" />
            2. 参照完整性
          </div>
          <div className="mt-2 font-mono text-[11px] text-sky-600 dark:text-sky-400 font-bold">
            FOREIGN KEY ... REFERENCES
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            外键取值必须是对应被引用父表中已存在的主键值，或取
            NULL（若业务允许未分配）。
          </p>
        </div>

        <div className="rounded-xl border border-emerald-400/30 bg-white p-4 dark:border-emerald-900/40 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-300">
            <Shield className="size-4 text-emerald-500" />
            3. 用户定义完整性
          </div>
          <div className="mt-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            CHECK / NOT NULL / UNIQUE
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            针对具体应用领域的数据要求。如年龄范围、成绩
            0~100、默认值与唯一性规则。
          </p>
        </div>
      </div>
    </Figure>
  );
}

export function JoinPathFigure() {
  return (
    <Figure
      title="教学数据库四表主外键连接路径"
      caption="学生表通过学号 sid 连接选课表；选课表通过课程号 cid 连接课程表；课程表通过工号 tid 连接教师表。三表或四表内连接与外连接必须遵循此路径。"
    >
      <div className="grid gap-2 sm:grid-cols-4 items-center">
        <div className="rounded-xl border border-indigo-400/30 bg-white p-3 text-center dark:bg-[#1a1f30]">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            t_student (学生)
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            PK: sid (学号)
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/40 bg-amber-50/50 p-3 text-center dark:bg-[#1a1f30]">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
            1 : N (sid = sid)
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
            t_student_course (选课)
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            PK/FK: sid, cid
          </div>
        </div>

        <div className="rounded-xl border border-sky-400/40 bg-sky-50/50 p-3 text-center dark:bg-[#1a1f30]">
          <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
            N : 1 (cid = cid)
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
            t_course (课程)
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            PK: cid | FK: tid
          </div>
        </div>

        <div className="rounded-xl border border-indigo-400/30 bg-white p-3 text-center dark:bg-[#1a1f30]">
          <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
            N : 1 (tid = tid)
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
            t_teacher (教师)
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            PK: tid (工号)
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function DbDesignStagesFigure() {
  const stages = [
    {
      num: "阶段 1",
      title: "需求分析",
      desc: "业务规则界定、数据流图 (DFD) 与数据字典",
      tag: "确定要做什么",
    },
    {
      num: "阶段 2",
      title: "概念结构设计",
      desc: "绘制实体-联系模型 (ER 图) 与文字表达",
      tag: "独立于具体 DBMS",
    },
    {
      num: "阶段 3",
      title: "逻辑结构设计",
      desc: "ER 转关系模式、1NF~3NF/BCNF 规范化推导",
      tag: "映射为关系表",
    },
    {
      num: "阶段 4",
      title: "物理结构设计",
      desc: "存储引擎、精确字段类型、约束与索引优化",
      tag: "落地到 MySQL DDL",
    },
  ];

  return (
    <Figure
      title="数据库工程设计的四大核心阶段生命周期"
      caption="从需求分析（DFD 与数据字典）出发，经过概念结构设计（ER 模型）、逻辑结构设计（ER 转表与规范化），最终落地到物理结构设计（存储引擎、约束与索引）。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((st) => (
          <div
            key={st.num}
            className="rounded-xl border border-indigo-500/20 bg-white p-4 shadow-xs dark:bg-[#1a1f30]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                {st.num}
              </span>
              <span className="text-[10px] text-slate-400">{st.tag}</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {st.title}
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {st.desc}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

export function BackupRestoreFlowFigure() {
  return (
    <Figure
      title="系统终端数据备份与恢复生命周期"
      caption="在操作系统终端中运行 mysqldump 抽取表结构与数据生成纯文本 .sql 脚本；通过 mysql 命令重定向 `<` 回放 SQL 语句完成数据与库表还原。"
    >
      <div className="grid gap-3 sm:grid-cols-3 items-center">
        <div className="rounded-xl border border-sky-400/30 bg-white p-4 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-xs text-sky-700 dark:text-sky-300">
            <Terminal className="size-4" /> 1. mysqldump 导出
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            读取源库表结构与数据，生成包含 DDL 与 INSERT 语句的纯文本 SQL 脚本。
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-50/40 p-4 text-center dark:bg-[#1a1f30]">
          <div className="flex items-center justify-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
            <FileText className="size-4" /> 2. 纯文本介质 (.sql)
          </div>
          <div className="mt-2 font-mono text-[11px] text-amber-700 dark:text-amber-400 font-bold">
            Dumpteachingdb.sql
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            可审计、可跨机器迁移
          </p>
        </div>

        <div className="rounded-xl border border-emerald-400/30 bg-white p-4 dark:bg-[#1a1f30]">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-300">
            <Terminal className="size-4" /> 3. mysql 重定向导入
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            逐行回放 SQL 命令，在目标数据库（teachingdb2）中完整重建表与数据。
          </p>
        </div>
      </div>
    </Figure>
  );
}
