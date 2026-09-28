const c = {
  ink: "#172554",
  muted: "#64748b",
  blue: "#2563eb",
  paleBlue: "#dbeafe",
  violet: "#7c3aed",
  paleViolet: "#ede9fe",
  green: "#15803d",
  paleGreen: "#dcfce7",
  amber: "#b45309",
  paleAmber: "#fef3c7",
  red: "#dc2626",
  paleRed: "#fee2e2",
  grid: "#cbd5e1",
  line: "#94a3b8",
};

export function CausalAttentionFigure() {
  const tokens = ["小明", "把", "书", "放进", "书包"];
  const size = 28;
  const x0 = 70;
  const y0 = 274;
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 900 440"
        className="h-auto w-full"
        role="img"
        aria-label="自回归语言模型流程：词元经过嵌入和位置编码，送入多层因果遮挡的注意力与前馈网络；下三角遮挡矩阵说明每个位置只能读取当前位置和左侧上下文"
      >
        <text
          x="450"
          y="29"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          词元经过层层变换，当前位置读取前文
        </text>
        {tokens.map((token, i) => (
          <g key={token}>
            <rect
              x={74 + i * 150}
              y="52"
              width="120"
              height="38"
              rx="9"
              fill={c.paleBlue}
              stroke={c.blue}
              strokeWidth="1.5"
            />
            <text
              x={134 + i * 150}
              y="77"
              textAnchor="middle"
              fontSize="15"
              fontWeight="600"
              fill={c.ink}
            >
              {token}
            </text>
          </g>
        ))}
        <path d="M 450 96 V 112" stroke={c.line} strokeWidth="2" />
        <path d="M 450 112 L 444 103 L 456 103 Z" fill={c.line} />
        <rect
          x="120"
          y="118"
          width="660"
          height="42"
          rx="11"
          fill={c.paleViolet}
          stroke={c.violet}
          strokeWidth="1.5"
        />
        <text
          x="450"
          y="145"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={c.violet}
        >
          词元嵌入 + 位置信息
        </text>
        <path d="M 450 166 V 183" stroke={c.line} strokeWidth="2" />
        <path d="M 450 183 L 444 174 L 456 174 Z" fill={c.line} />
        <rect
          x="82"
          y="189"
          width="350"
          height="56"
          rx="12"
          fill="#f8fafc"
          stroke={c.blue}
          strokeWidth="1.5"
        />
        <text
          x="257"
          y="213"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={c.blue}
        >
          因果遮挡的自注意力
        </text>
        <text x="257" y="234" textAnchor="middle" fontSize="12" fill={c.muted}>
          查询、键和值组合可见上下文
        </text>
        <path d="M 438 217 H 466" stroke={c.line} strokeWidth="2" />
        <path d="M 466 217 L 457 211 L 457 223 Z" fill={c.line} />
        <rect
          x="474"
          y="189"
          width="190"
          height="56"
          rx="12"
          fill={c.paleGreen}
          stroke={c.green}
          strokeWidth="1.5"
        />
        <text
          x="569"
          y="213"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={c.green}
        >
          前馈网络
        </text>
        <text x="569" y="234" textAnchor="middle" fontSize="12" fill={c.muted}>
          逐位置继续变换
        </text>
        <text x="700" y="259" textAnchor="middle" fontSize="11" fill={c.violet}>
          残差等结构省略，多层重复
        </text>

        <text x="105" y="267" fontSize="13" fontWeight="700" fill={c.ink}>
          遮挡矩阵：绿色可见，红色被遮挡
        </text>
        {tokens.map((token, row) =>
          tokens.map((_, col) => {
            const allowed = col <= row;
            return (
              <rect
                key={`${row}-${col}`}
                x={x0 + col * size}
                y={y0 + row * size}
                width={size - 3}
                height={size - 3}
                rx="3"
                fill={allowed ? c.paleGreen : c.paleRed}
                stroke={allowed ? c.green : c.red}
                strokeWidth="1"
              />
            );
          }),
        )}
        <text x="48" y="263" fontSize="11" fill={c.muted}>
          行 i
        </text>
        <text x="272" y="263" fontSize="11" fill={c.muted}>
          列 j
        </text>
        <text x="340" y="294" fontSize="14" fontWeight="600" fill={c.ink}>
          当前位置 i 只能读取 j ≤ i
        </text>
        <text x="340" y="322" fontSize="13" fill={c.muted}>
          训练时可并行计算各位置，但未来词元对它不可见。
        </text>
        <text x="340" y="351" fontSize="13" fill={c.muted}>
          例如第 3 个位置能看见 1、2、3，不能看见 4、5。
        </text>
        <rect
          x="340"
          y="372"
          width="470"
          height="32"
          rx="9"
          fill={c.paleAmber}
        />
        <text
          x="575"
          y="393"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill={c.amber}
        >
          输出层据此计算下一个词元的分数与概率
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        遮挡让训练目标和实际生成保持一致：预测时只能依靠已经出现的文字。结构示意参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_attention-mechanisms/transformer.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的 Transformer
        </a>
        相关内容并重新绘制。
      </figcaption>
    </figure>
  );
}

export function TokenGenerationFigure() {
  const candidates = [
    { label: "绿", width: 180, value: "0.70", fill: c.green },
    { label: "红", width: 39, value: "0.15", fill: c.red },
    { label: "黄", width: 26, value: "0.10", fill: c.amber },
    { label: "其他", width: 13, value: "0.05", fill: c.muted },
  ];
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 900 340"
        className="h-auto w-full"
        role="img"
        aria-label="逐词元生成循环：当前上下文送入模型得到下一个词元概率分布，选择一个候选词元追加到上下文，再用更新后的上下文继续预测"
      >
        <defs>
          <marker
            id="lm-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.line} />
          </marker>
          <marker
            id="lm-green-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.green} />
          </marker>
        </defs>
        <text
          x="450"
          y="30"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          一次生成一个词元，输出再成为新输入
        </text>
        <rect
          x="35"
          y="95"
          width="185"
          height="82"
          rx="14"
          fill={c.paleBlue}
          stroke={c.blue}
          strokeWidth="2"
        />
        <text
          x="127"
          y="126"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill={c.blue}
        >
          当前上下文
        </text>
        <text x="127" y="151" textAnchor="middle" fontSize="14" fill={c.ink}>
          春天来了，树叶变得…
        </text>
        <path
          d="M 225 136 H 271"
          stroke={c.line}
          strokeWidth="2.5"
          markerEnd="url(#lm-arrow)"
        />
        <rect
          x="280"
          y="73"
          width="300"
          height="126"
          rx="14"
          fill="#f8fafc"
          stroke={c.violet}
          strokeWidth="2"
        />
        <text
          x="430"
          y="99"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={c.violet}
        >
          下一个词元的概率分布
        </text>
        {candidates.map((item, i) => (
          <g key={item.label}>
            <text x="306" y={126 + i * 19} fontSize="12" fill={c.ink}>
              {item.label}
            </text>
            <rect
              x="345"
              y={115 + i * 19}
              width="190"
              height="11"
              rx="5"
              fill="#e2e8f0"
            />
            <rect
              x="345"
              y={115 + i * 19}
              width={item.width}
              height="11"
              rx="5"
              fill={item.fill}
            />
            <text
              x="546"
              y={125 + i * 19}
              textAnchor="end"
              fontSize="11"
              fill={c.muted}
            >
              {item.value}
            </text>
          </g>
        ))}
        <path
          d="M 585 136 H 625"
          stroke={c.line}
          strokeWidth="2.5"
          markerEnd="url(#lm-arrow)"
        />
        <rect
          x="635"
          y="95"
          width="118"
          height="82"
          rx="14"
          fill={c.paleAmber}
          stroke={c.amber}
          strokeWidth="2"
        />
        <text
          x="694"
          y="126"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={c.amber}
        >
          选择词元
        </text>
        <text
          x="694"
          y="151"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill={c.ink}
        >
          绿
        </text>
        <path
          d="M 758 136 H 789"
          stroke={c.line}
          strokeWidth="2.5"
          markerEnd="url(#lm-arrow)"
        />
        <rect
          x="799"
          y="95"
          width="76"
          height="82"
          rx="14"
          fill={c.paleGreen}
          stroke={c.green}
          strokeWidth="2"
        />
        <text
          x="837"
          y="127"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill={c.green}
        >
          追加
        </text>
        <text
          x="837"
          y="153"
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill={c.ink}
        >
          绿
        </text>

        <path
          d="M 837 183 C 837 248 740 296 620 296 H 170 C 90 296 55 242 81 185"
          fill="none"
          stroke={c.green}
          strokeWidth="2.5"
          strokeDasharray="7 6"
          markerEnd="url(#lm-green-arrow)"
        />
        <rect
          x="248"
          y="230"
          width="400"
          height="54"
          rx="12"
          fill={c.paleGreen}
          stroke="white"
          strokeWidth="3"
        />
        <text
          x="448"
          y="253"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill={c.green}
        >
          新上下文：春天来了，树叶变得绿
        </text>
        <text x="448" y="273" textAnchor="middle" fontSize="12" fill={c.ink}>
          重新计算分布，再预测下一个词元
        </text>
        <text x="450" y="329" textAnchor="middle" fontSize="12" fill={c.muted}>
          示意概率：绿 0.70、红 0.15、黄 0.10、其他 0.05；并非真实模型输出
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        温度等生成设置会改变候选分布与选择过程，但不会给模型增加事实知识。逐步续写的概念参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_recurrent-neural-networks/language-models-and-dataset.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的语言模型章节
        </a>
        并重新绘制。
      </figcaption>
    </figure>
  );
}
