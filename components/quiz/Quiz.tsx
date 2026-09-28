"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { shortHash } from "@/lib/shared";

export interface QuizProps {
  question: string;
  options: string[];
  answer: string;
  explanation?: ReactNode;
  id?: string;
}

// 选项常写成 "A xxx" 的教材式序号，答案则不带序号，比较前统一去除
function normalizeOption(text: string) {
  return text.replace(/^[A-D][.、．:：]?\s+/, "").trim();
}

/**
 * 讲义里 quiz 分散在正文各小节与文末练习，需按最近的标题分组的题号
 * （标题之下第 1 道为 1，跨过新标题重新计数）。纯客户端计算：统计
 * 当前 quiz 所在 .prose 容器里、自己之前且位于最近一个标题之后的
 * quiz-box 数量。首屏先不渲染，挂载后填入，避免与服务端 HTML 不一致。
 */
function useQuizIndex() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = (el.closest(".prose") ??
      el.closest("article, main")) as HTMLElement | null;
    if (!root) {
      setIndex(1);
      return;
    }
    let idx = 0;
    for (const node of root.querySelectorAll("h1,h2,h3,h4,h5,h6,.quiz-box")) {
      if (node === el) {
        idx += 1;
        break;
      }
      if (node.matches(".quiz-box")) idx += 1;
      else idx = 0; // 遇到标题：新的一组，重新从 1 计
    }
    setIndex(idx);
  }, []);

  return { ref, index };
}

export default function Quiz({
  question,
  options,
  answer,
  explanation,
  id,
}: QuizProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { ref, index } = useQuizIndex();

  const showResult = submitted;

  const normAnswer = normalizeOption(answer);
  const isCorrect =
    selected !== null && normalizeOption(selected) === normAnswer;
  const anchorId = id ?? `quiz-${shortHash(question)}`;

  function submitAnswer() {
    if (!selected) return;
    setSubmitted(true);
  }

  function reset() {
    setSelected(null);
    setSubmitted(false);
  }

  return (
    <div
      ref={ref}
      id={anchorId}
      className="quiz-box my-6 rounded-xl border border-fd-border bg-fd-card p-5 not-prose"
    >
      <p className="mb-4 text-sm font-medium text-fd-foreground">
        {index > 0 && (
          <span
            aria-hidden
            className="mr-2 inline-block rounded-md border border-fd-primary/30 bg-fd-primary/10 px-1.5 text-sm font-semibold text-fd-primary"
          >
            第{index}题
          </span>
        )}
        {question}
      </p>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="选项">
        {options.map((option) => {
          const chosen = selected === option;
          const isAnswerOption = normalizeOption(option) === normAnswer;
          const showState = showResult && (chosen || isAnswerOption);

          let className =
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors";
          if (!submitted) {
            className += chosen
              ? " border-fd-primary bg-fd-primary/10 text-fd-primary"
              : " border-fd-border hover:bg-fd-secondary";
          } else if (showResult && isAnswerOption) {
            className +=
              " border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
          } else if (showResult && chosen) {
            className +=
              " border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-400";
          } else if (showResult) {
            className += " border-fd-border opacity-50";
          } else if (chosen) {
            className += " border-fd-primary bg-fd-primary/10 text-fd-primary";
          } else {
            className += " border-fd-border opacity-60";
          }

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={submitted}
              onClick={() => setSelected(option)}
              className={className}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  chosen ? "border-current" : "border-fd-border"
                }`}
              >
                {showState &&
                  (isAnswerOption ? (
                    <Check className="size-3" />
                  ) : chosen ? (
                    <X className="size-3" />
                  ) : null)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!selected}
            className="rounded-lg bg-fd-primary px-4 py-1.5 text-sm font-medium text-fd-primary-foreground transition-opacity disabled:opacity-40"
          >
            提交答案
          </button>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                isCorrect
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-700 dark:text-red-400"
              }`}
            >
              {isCorrect ? (
                <Check className="size-4" />
              ) : (
                <X className="size-4" />
              )}
              {isCorrect ? "回答正确" : "回答错误"}
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border px-3 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-secondary"
            >
              <RotateCcw className="size-3.5" />
              重试
            </button>
          </>
        )}
      </div>

      {showResult && explanation && (
        <div className="mt-4 border-t border-fd-border pt-3 text-sm text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground">解析：</span>
          {explanation}
        </div>
      )}
    </div>
  );
}
