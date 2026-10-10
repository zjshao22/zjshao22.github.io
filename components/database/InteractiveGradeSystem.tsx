"use client";

import { useState } from "react";
import {
  GraduationCap,
  LogOut,
  LogIn,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  User,
  RotateCcw,
  Camera,
  Layers,
  X,
  Sparkles,
} from "lucide-react";

interface Teacher {
  tid: string;
  tname: string;
  age: number;
  title: string;
}

interface Course {
  cid: string;
  cname: string;
  tid: string;
}

interface Student {
  sid: string;
  sname: string;
  sex: string;
  age: number;
  major: string;
}

interface Enrollment {
  sid: string;
  sname: string;
  sex: string;
  age: number;
  major: string;
  cid: string;
  cname: string;
  score: number | null;
}

const TEACHERS: Teacher[] = [
  { tid: "t001", tname: "李明", age: 40, title: "副教授" },
  { tid: "t004", tname: "韩伟", age: 32, title: "副教授" },
  { tid: "t007", tname: "李敏", age: 28, title: "讲师" },
];

const ALL_COURSES: Course[] = [
  { cid: "c001", cname: "数据库", tid: "t001" },
  { cid: "c003", cname: "软件测试", tid: "t001" },
  { cid: "c005", cname: "微机原理", tid: "t004" },
  { cid: "c008", cname: "计算机基础", tid: "t004" },
  { cid: "c006", cname: "网站开发", tid: "t007" },
];

const ALL_STUDENTS: Student[] = [
  { sid: "2012001", sname: "王珊", sex: "女", age: 25, major: "软件工程" },
  { sid: "2012002", sname: "李平", sex: "男", age: 27, major: "软件工程" },
  { sid: "2012003", sname: "张华", sex: "男", age: 30, major: "机械电子" },
  { sid: "2012004", sname: "吴军", sex: "男", age: 33, major: "软件工程" },
  { sid: "2012005", sname: "李勇", sex: "男", age: 32, major: "机械电子" },
  { sid: "2012006", sname: "周云", sex: "女", age: 30, major: "英语" },
  { sid: "2012007", sname: "李娜", sex: "女", age: 29, major: "软件工程" },
  { sid: "2013001", sname: "杨玲", sex: "女", age: 28, major: "英语" },
  { sid: "2013002", sname: "王新", sex: "男", age: 30, major: "软件工程" },
  { sid: "2013003", sname: "孙强", sex: "男", age: 31, major: "机械电子" },
  { sid: "2013004", sname: "华宇", sex: "男", age: 19, major: "未定" },
  { sid: "2013005", sname: "李华", sex: "女", age: 25, major: "软件工程" },
];

const INITIAL_ENROLLMENTS: Enrollment[] = [
  // c001 - 李明
  {
    sid: "2012001",
    sname: "王珊",
    sex: "女",
    age: 25,
    major: "软件工程",
    cid: "c001",
    cname: "数据库",
    score: 87,
  },
  {
    sid: "2012003",
    sname: "张华",
    sex: "男",
    age: 30,
    major: "机械电子",
    cid: "c001",
    cname: "数据库",
    score: 90,
  },
  {
    sid: "2012005",
    sname: "李勇",
    sex: "男",
    age: 32,
    major: "机械电子",
    cid: "c001",
    cname: "数据库",
    score: null,
  },
  {
    sid: "2013001",
    sname: "杨玲",
    sex: "女",
    age: 28,
    major: "英语",
    cid: "c001",
    cname: "数据库",
    score: 82,
  },
  // c003 - 李明
  {
    sid: "2012001",
    sname: "王珊",
    sex: "女",
    age: 25,
    major: "软件工程",
    cid: "c003",
    cname: "软件测试",
    score: 80,
  },
  {
    sid: "2012002",
    sname: "李平",
    sex: "男",
    age: 27,
    major: "软件工程",
    cid: "c003",
    cname: "软件测试",
    score: 70,
  },
  {
    sid: "2012003",
    sname: "张华",
    sex: "男",
    age: 30,
    major: "机械电子",
    cid: "c003",
    cname: "软件测试",
    score: 85,
  },
  {
    sid: "2012004",
    sname: "吴军",
    sex: "男",
    age: 33,
    major: "软件工程",
    cid: "c003",
    cname: "软件测试",
    score: 90,
  },
  // c005 - 韩伟
  {
    sid: "2012002",
    sname: "李平",
    sex: "男",
    age: 27,
    major: "软件工程",
    cid: "c005",
    cname: "微机原理",
    score: 88,
  },
  {
    sid: "2012003",
    sname: "张华",
    sex: "男",
    age: 30,
    major: "机械电子",
    cid: "c005",
    cname: "微机原理",
    score: 79,
  },
  // c008 - 韩伟
  {
    sid: "2012001",
    sname: "王珊",
    sex: "女",
    age: 25,
    major: "软件工程",
    cid: "c008",
    cname: "计算机基础",
    score: 90,
  },
  {
    sid: "2012004",
    sname: "吴军",
    sex: "男",
    age: 33,
    major: "软件工程",
    cid: "c008",
    cname: "计算机基础",
    score: 97,
  },
];

type ViewMode =
  "interactive" | "login" | "overview" | "add" | "delete" | "grade";

export default function InteractiveGradeSystem() {
  const [viewMode, setViewMode] = useState<ViewMode>("interactive");

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher>(TEACHERS[0]);
  const [loginInputTid, setLoginInputTid] = useState("t001");
  const [loginPassword, setLoginPassword] = useState("123456");
  const [loginError, setLoginError] = useState("");

  // Course & Data State
  const [selectedCid, setSelectedCid] = useState("c001");
  const [enrollments, setEnrollments] =
    useState<Enrollment[]>(INITIAL_ENROLLMENTS);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSelectedSid, setAddSelectedSid] = useState("");
  const [addInitialScore, setAddInitialScore] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);

  const [editScoreTarget, setEditScoreTarget] = useState<Enrollment | null>(
    null,
  );
  const [editScoreValue, setEditScoreValue] = useState("");
  const [editScoreError, setEditScoreError] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Filter courses taught by current teacher
  const teacherCourses = ALL_COURSES.filter(
    (c) => c.tid === currentTeacher.tid,
  );

  // If selected course not in teacher courses, switch to first
  const currentCourse =
    teacherCourses.find((c) => c.cid === selectedCid) ||
    teacherCourses[0] ||
    ALL_COURSES[0];

  // Filter enrollments for current course
  const currentEnrollments = enrollments.filter(
    (e) => e.cid === currentCourse.cid,
  );

  // Students eligible to add to current course (not already enrolled)
  const eligibleStudents = ALL_STUDENTS.filter(
    (s) => !currentEnrollments.some((e) => e.sid === s.sid),
  );

  // Handle Login
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginPassword || loginPassword.trim() !== "123456") {
      setLoginError("密码错误！教学模拟系统默认口令为: 123456");
      return;
    }
    const found = TEACHERS.find((t) => t.tid === loginInputTid.trim());
    if (!found) {
      setLoginError(
        "工号不存在！系统中任课教师工号为 t001(李明)、t004(韩伟)、t007(李敏)",
      );
      return;
    }
    setLoginError("");
    setCurrentTeacher(found);
    setIsLoggedIn(true);
    const firstCourse = ALL_COURSES.find((c) => c.tid === found.tid);
    if (firstCourse) setSelectedCid(firstCourse.cid);
    showToast(
      `教师登录成功：欢迎 ${found.tname} ${found.title}！已隔离加载所属授课数据。`,
    );
  };

  // Quick switch teacher
  const handleQuickTeacher = (t: Teacher) => {
    setCurrentTeacher(t);
    setLoginInputTid(t.tid);
    setIsLoggedIn(true);
    const firstCourse = ALL_COURSES.find((c) => c.tid === t.tid);
    if (firstCourse) setSelectedCid(firstCourse.cid);
    showToast(`已切换身份：当前任课教师为 ${t.tname}（工号: ${t.tid}）`);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    showToast("已成功注销登录，已退出教师端会话。");
  };

  // Handle Add Enrollment
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSelectedSid) {
      alert("请选择要添加的学生！");
      return;
    }
    const stu = ALL_STUDENTS.find((s) => s.sid === addSelectedSid);
    if (!stu) return;

    let scoreNum: number | null = null;
    if (addInitialScore.trim() !== "") {
      const parsed = Number(addInitialScore);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        alert("初始成绩必须在 0 ~ 100 之间！");
        return;
      }
      scoreNum = parsed;
    }

    const newRecord: Enrollment = {
      sid: stu.sid,
      sname: stu.sname,
      sex: stu.sex,
      age: stu.age,
      major: stu.major,
      cid: currentCourse.cid,
      cname: currentCourse.cname,
      score: scoreNum,
    };

    setEnrollments([...enrollments, newRecord]);
    setShowAddModal(false);
    setAddSelectedSid("");
    setAddInitialScore("");
    showToast(
      `成功为课程 [${currentCourse.cname}] 添加选课学生：${stu.sname} (${stu.sid})`,
    );
  };

  // Handle Delete Enrollment
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setEnrollments(
      enrollments.filter(
        (e) => !(e.sid === deleteTarget.sid && e.cid === deleteTarget.cid),
      ),
    );
    showToast(
      `已退选学生：${deleteTarget.sname} (${deleteTarget.sid}) 从 [${deleteTarget.cname}] 移除`,
    );
    setDeleteTarget(null);
  };

  // Handle Edit/Input Score
  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editScoreTarget) return;
    const val = editScoreValue.trim();
    if (val === "") {
      setEditScoreError("请输入成绩值（0~100）");
      return;
    }
    const num = Number(val);
    if (isNaN(num) || num < 0 || num > 100) {
      setEditScoreError("输入错误：成绩必须在 0 到 100 分之间！");
      return;
    }

    setEnrollments(
      enrollments.map((en) => {
        if (en.sid === editScoreTarget.sid && en.cid === editScoreTarget.cid) {
          return { ...en, score: num };
        }
        return en;
      }),
    );
    showToast(
      `成绩更新成功：${editScoreTarget.sname} 的 [${editScoreTarget.cname}] 成绩已置为 ${num} 分`,
    );
    setEditScoreTarget(null);
    setEditScoreValue("");
    setEditScoreError("");
  };

  // Reset to original data
  const handleResetData = () => {
    setEnrollments(INITIAL_ENROLLMENTS);
    setCurrentTeacher(TEACHERS[0]);
    setSelectedCid("c001");
    setIsLoggedIn(true);
    showToast("演示数据已重置为基准状态！");
  };

  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-indigo-900/20 bg-slate-900 text-slate-100 shadow-2xl dark:border-indigo-500/20">
      {/* Top Banner & Mode Switcher */}
      <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <GraduationCap className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">
                  实验四：学生成绩管理系统 UI 真机仿真器
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  教学交互原型 · 实验报告请使用本地工程真实截图
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                面向任课教师 ·
                业务逻辑参考原型（报告成果须使用本地代码运行并经真实 MySQL 验证的截图）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              title="重置初始选课数据"
            >
              <RotateCcw className="size-3" /> 重置数据
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-800/80 pt-2.5">
          <button
            type="button"
            onClick={() => {
              setViewMode("interactive");
              setIsLoggedIn(true);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "interactive"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Sparkles className="size-3.5" /> ⚡ 实时交互控制台
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("login");
              setIsLoggedIn(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "login"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Camera className="size-3.5 text-amber-400" /> 📸
            截图1：登录与注销界面
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("overview");
              setIsLoggedIn(true);
              setShowAddModal(false);
              setDeleteTarget(null);
              setEditScoreTarget(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "overview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Camera className="size-3.5 text-emerald-400" /> 📸
            截图2：选课情况总览台
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("add");
              setIsLoggedIn(true);
              setShowAddModal(true);
              setDeleteTarget(null);
              setEditScoreTarget(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "add"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Camera className="size-3.5 text-cyan-400" /> 📸 截图3：添加选课弹窗
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("delete");
              setIsLoggedIn(true);
              setShowAddModal(false);
              setDeleteTarget(currentEnrollments[0] || null);
              setEditScoreTarget(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "delete"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Camera className="size-3.5 text-rose-400" /> 📸 截图4：退选确认弹窗
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("grade");
              setIsLoggedIn(true);
              setShowAddModal(false);
              setDeleteTarget(null);
              const target =
                currentEnrollments.find((e) => e.score === null) ||
                currentEnrollments[0];
              if (target) {
                setEditScoreTarget(target);
                setEditScoreValue(
                  target.score !== null ? String(target.score) : "",
                );
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "grade"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Camera className="size-3.5 text-purple-400" /> 📸
            截图5：成绩录入与修改
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center gap-2 transition-all">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Browser Chrome Simulator */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
        </div>
        <div className="flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span className="truncate">
            http://localhost:3000/teacher-portal/
            {isLoggedIn ? `dashboard?tid=${currentTeacher.tid}` : "login"}
          </span>
          <span className="text-[10px] text-slate-500 uppercase ml-2">
            UI Client Preview
          </span>
        </div>
      </div>

      {/* Main App Body */}
      <div className="bg-slate-900/95 p-4 sm:p-6 min-h-[460px] flex flex-col justify-between">
        {!isLoggedIn ? (
          /* ============================================================ */
          /* 1. 登录与注销界面 (Login View) */
          /* ============================================================ */
          <div className="mx-auto my-6 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
                <GraduationCap className="size-6" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">
                教师成绩管理系统 · 身份登录
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                系统用户规定为任课教师 · 请输入教师工号登录以获取专属任课数据
              </p>
            </div>

            {loginError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  教师工号 (tid)
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    value={loginInputTid}
                    onChange={(e) => setLoginInputTid(e.target.value)}
                    placeholder="例如: t001, t004, t007"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <User className="pointer-events-none absolute right-3 top-2.5 size-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  登录密码
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="******"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
              >
                <LogIn className="size-4" /> 登 录 进 入 系 统
              </button>
            </form>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <span className="block text-[11px] font-semibold text-slate-400">
                快捷测试账号（点击一键登录）：
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {TEACHERS.map((t) => (
                  <button
                    key={t.tid}
                    type="button"
                    onClick={() => handleQuickTeacher(t)}
                    className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500 hover:text-white"
                  >
                    {t.tname} ({t.tid} · {t.title})
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* 2. 教师端主控台 (Dashboard View) */
          /* ============================================================ */
          <div className="space-y-5">
            {/* App Nav Header */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    学生成绩管理系统 · 教师主控台
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-indigo-300">
                      <User className="size-3" /> {currentTeacher.tname}（工号:{" "}
                      {currentTeacher.tid}）
                    </span>
                    <span>·</span>
                    <span className="rounded bg-indigo-950 px-1.5 py-0.5 text-[10px] text-indigo-300 border border-indigo-800/40">
                      职称: {currentTeacher.title}
                    </span>
                    <span>·</span>
                    <span>年龄: {currentTeacher.age} 岁</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="relative">
                  <select
                    value={currentTeacher.tid}
                    onChange={(e) => {
                      const t = TEACHERS.find((x) => x.tid === e.target.value);
                      if (t) handleQuickTeacher(t);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {TEACHERS.map((t) => (
                      <option key={t.tid} value={t.tid}>
                        切换教师: {t.tname} ({t.tid})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  <LogOut className="size-3.5" /> 注销退出
                </button>
              </div>
            </div>

            {/* Course Filter & Action Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold text-slate-300">
                  当前承担的主讲课程：
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {teacherCourses.map((c) => (
                    <button
                      key={c.cid}
                      type="button"
                      onClick={() => setSelectedCid(c.cid)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        currentCourse.cid === c.cid
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{c.cname}</span>
                      <span className="font-mono text-[10px] opacity-75">
                        ({c.cid})
                      </span>
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-500 hidden md:inline">
                  |
                </span>

                <span className="text-xs text-slate-400">
                  当前课程选修：
                  <strong className="text-indigo-300 font-mono">
                    {currentEnrollments.length}
                  </strong>{" "}
                  人 （未登分：
                  <strong className="text-amber-300 font-mono">
                    {currentEnrollments.filter((e) => e.score === null).length}
                  </strong>{" "}
                  人）
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  if (eligibleStudents.length > 0) {
                    setAddSelectedSid(eligibleStudents[0].sid);
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
              >
                <Plus className="size-3.5" /> + 为本课程添加选课
              </button>
            </div>

            {/* Enrolled Students Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg">
              <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">
                    【{currentCourse.cname}】课程学生选课花名册与成绩单
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  WHERE c.tid = &apos;{currentTeacher.tid}&apos; AND c.cid =
                  &apos;{currentCourse.cid}&apos;
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                      <th className="px-4 py-3">学号 (sid)</th>
                      <th className="px-4 py-3">学生姓名</th>
                      <th className="px-4 py-3">性别</th>
                      <th className="px-4 py-3">年龄</th>
                      <th className="px-4 py-3">专业 (major)</th>
                      <th className="px-4 py-3">课程成绩 (score)</th>
                      <th className="px-4 py-3">登分状态</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {currentEnrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-slate-500"
                        >
                          暂无学生选修该门课程。可点击上方 “+ 为本课程添加选课”
                          添加学生记录。
                        </td>
                      </tr>
                    ) : (
                      currentEnrollments.map((item) => {
                        const isGraded = item.score !== null;
                        return (
                          <tr
                            key={item.sid}
                            className="hover:bg-slate-900/40 transition-colors font-sans"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-slate-200">
                              {item.sid}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">
                              {item.sname}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {item.sex}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {item.age}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {item.major}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {isGraded ? (
                                <span
                                  className={`text-sm font-bold ${
                                    (item.score ?? 0) >= 90
                                      ? "text-emerald-400"
                                      : (item.score ?? 0) >= 60
                                        ? "text-indigo-300"
                                        : "text-rose-400"
                                  }`}
                                >
                                  {item.score}
                                </span>
                              ) : (
                                <span className="font-sans italic text-amber-400/90 text-xs">
                                  NULL (暂未录入)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="size-3" /> 已登分
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                                  <AlertTriangle className="size-3" /> 待录入
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditScoreTarget(item);
                                    setEditScoreValue(
                                      item.score !== null
                                        ? String(item.score)
                                        : "",
                                    );
                                    setEditScoreError("");
                                  }}
                                  className="flex items-center gap-1 rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
                                >
                                  <Edit3 className="size-3" />
                                  {isGraded ? "修改成绩" : "录入成绩"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                                >
                                  <Trash2 className="size-3" /> 退选
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Modal 1: 添加选课记录弹窗 (Add Enrollment Modal) */}
        {/* ============================================================ */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
                    <Plus className="size-4" />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    添加选课记录 · 【{currentCourse.cname}】
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    选择待选课学生：
                  </label>
                  {eligibleStudents.length === 0 ? (
                    <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      所有基准库学生均已选修该课程！
                    </div>
                  ) : (
                    <select
                      value={addSelectedSid}
                      onChange={(e) => setAddSelectedSid(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      {eligibleStudents.map((s) => (
                        <option key={s.sid} value={s.sid}>
                          {s.sid} - {s.sname} ({s.sex} · {s.age}岁 · {s.major})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    注：系统自动过滤已选该课程的学生，确保不违反 `(sid, cid)`
                    复合主键唯一性。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    初始成绩（选填，0~100 分，留空表示尚未登分）：
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={addInitialScore}
                    onChange={(e) => setAddInitialScore(e.target.value)}
                    placeholder="例如: 85 或留空"
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={eligibleStudents.length === 0}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
                  >
                    确认添加选课
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Modal 2: 删除退选确认弹窗 (Delete Confirmation Modal) */}
        {/* ============================================================ */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30 shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    确认退选该学生记录？
                  </h4>
                  <p className="text-xs text-slate-400">
                    退选将永久删除该选课及对应成绩记录
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-slate-950 p-3 text-xs space-y-1.5 border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>学生学号与姓名：</span>
                  <strong className="text-white">
                    {deleteTarget.sid} · {deleteTarget.sname}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>退选课程：</span>
                  <strong className="text-indigo-300">
                    {deleteTarget.cname} ({deleteTarget.cid})
                  </strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>已登成绩：</span>
                  <strong className="text-amber-300">
                    {deleteTarget.score !== null
                      ? `${deleteTarget.score} 分`
                      : "未登分"}
                  </strong>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-rose-500"
                >
                  确认删除选课
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Modal 3: 成绩录入与修改弹窗 (Score Edit Modal) */}
        {/* ============================================================ */}
        {editScoreTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                    <Edit3 className="size-4" />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {editScoreTarget.score !== null
                      ? "修改课程成绩"
                      : "录入课程成绩"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditScoreTarget(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveScore} className="mt-4 space-y-4">
                <div className="rounded-lg bg-slate-950 p-3 text-xs space-y-1 border border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>学生：</span>
                    <strong className="text-white">
                      {editScoreTarget.sid} · {editScoreTarget.sname}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>课程：</span>
                    <strong className="text-indigo-300">
                      {editScoreTarget.cname} ({editScoreTarget.cid})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>当前登记状态：</span>
                    <span className="font-bold text-amber-300">
                      {editScoreTarget.score !== null
                        ? `${editScoreTarget.score} 分`
                        : "NULL (暂无成绩)"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    输入新成绩（0 ~ 100 分整数）：
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    autoFocus
                    value={editScoreValue}
                    onChange={(e) => {
                      setEditScoreValue(e.target.value);
                      setEditScoreError("");
                    }}
                    placeholder="0-100"
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  {editScoreError && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="size-3" /> {editScoreError}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditScoreTarget(null)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
                  >
                    保存成绩修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Callout */}
      <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-400">实验报告核验提示：</span>
          <span>
            系统已完全实现任课教师的数据范围隔离（只能查看、录入和修改本人名下承担课程的选课与成绩）。
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          实验四提交物：工程源文件 + 系统说明文档（包含上述 5
          个主要运行结果截图）
        </span>
      </div>
    </div>
  );
}
