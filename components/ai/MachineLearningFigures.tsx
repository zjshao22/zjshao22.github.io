const colors = {
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
  line: "#94a3b8",
  grid: "#e2e8f0",
  red: "#dc2626",
  paleRed: "#fee2e2",
};

const Box = ({
  x,
  label,
  detail,
  fill,
  stroke,
}: {
  x: number;
  label: string;
  detail: string;
  fill: string;
  stroke: string;
}) => (
  <g>
    <rect
      x={x}
      y="54"
      width="112"
      height="78"
      rx="14"
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
    />
    <text
      x={x + 56}
      y="85"
      textAnchor="middle"
      fontSize="18"
      fontWeight="700"
      fill={colors.ink}
    >
      {label}
    </text>
    <text
      x={x + 56}
      y="111"
      textAnchor="middle"
      fontSize="13"
      fill={colors.muted}
    >
      {detail}
    </text>
  </g>
);

export function LearningLoopFigure() {
  const boxes = [
    {
      label: "训练样本",
      detail: "特征 x，标签 y",
      fill: colors.paleBlue,
      stroke: colors.blue,
    },
    {
      label: "模型",
      detail: "当前参数 w、b",
      fill: colors.paleViolet,
      stroke: colors.violet,
    },
    {
      label: "预测",
      detail: "ŷ = wx + b",
      fill: colors.paleBlue,
      stroke: colors.blue,
    },
    {
      label: "损失",
      detail: "预测差多少",
      fill: colors.paleAmber,
      stroke: colors.amber,
    },
    {
      label: "梯度",
      detail: "参数往哪改",
      fill: colors.paleAmber,
      stroke: colors.amber,
    },
    {
      label: "更新参数",
      detail: "走一小步",
      fill: colors.paleGreen,
      stroke: colors.green,
    },
  ];
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 900 220"
        className="h-auto w-full"
        role="img"
        aria-label="机器学习训练循环：训练样本进入模型得到预测，预测与标签计算损失，梯度决定参数调整方向，更新后再预测"
      >
        <defs>
          <marker
            id="ml-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.line} />
          </marker>
          <marker
            id="ml-loop-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.green} />
          </marker>
        </defs>
        {boxes.map((box, index) => {
          const x = 20 + index * 145;
          return (
            <g key={box.label}>
              <Box x={x} {...box} />
              {index < boxes.length - 1 && (
                <path
                  d={`M ${x + 115} 93 H ${x + 139}`}
                  stroke={colors.line}
                  strokeWidth="2"
                  markerEnd="url(#ml-arrow)"
                />
              )}
            </g>
          );
        })}
        <path
          d="M 818 142 C 818 188 760 190 724 190 H 180 C 142 190 82 184 82 143"
          fill="none"
          stroke={colors.green}
          strokeWidth="2.5"
          strokeDasharray="7 6"
          markerEnd="url(#ml-loop-arrow)"
        />
        <text
          x="450"
          y="181"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={colors.green}
        >
          重复多轮，观察整批样本的损失
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        学习不是一次“猜答案”：参数更新后，模型要重新预测并计算损失。流程图为本课重绘，计算链参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_linear-networks/linear-regression.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的线性回归
        </a>
        。
      </figcaption>
    </figure>
  );
}

export function GeneralizationCurveFigure() {
  const x = [95, 203, 311, 419, 527, 635];
  const train = [236, 207, 177, 151, 132, 117];
  const validation = [240, 210, 183, 167, 177, 203];
  const poly = (ys: number[]) => x.map((px, i) => `${px},${ys[i]}`).join(" ");
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 720 330"
        className="h-auto w-full"
        role="img"
        aria-label="训练和验证损失示意曲线：训练损失持续下降，验证损失先下降后上升，后半段出现过拟合迹象"
      >
        <text
          x="360"
          y="30"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={colors.ink}
        >
          训练损失下降，验证损失开始回升
        </text>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 70 + i * 48;
          return (
            <line
              key={i}
              x1="86"
              x2="655"
              y1={y}
              y2={y}
              stroke={colors.grid}
              strokeWidth="1"
            />
          );
        })}
        <path
          d="M 86 58 V 266 H 665"
          fill="none"
          stroke={colors.muted}
          strokeWidth="2"
        />
        <text
          x="32"
          y="164"
          transform="rotate(-90 32 164)"
          textAnchor="middle"
          fontSize="14"
          fill={colors.muted}
        >
          损失（越低越好）
        </text>
        <text
          x="370"
          y="300"
          textAnchor="middle"
          fontSize="14"
          fill={colors.muted}
        >
          训练轮次增加 →
        </text>
        <polyline
          points={poly(train)}
          fill="none"
          stroke={colors.blue}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={poly(validation)}
          fill="none"
          stroke={colors.red}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {x.map((px, i) => (
          <g key={px}>
            <circle cx={px} cy={train[i]} r="5" fill={colors.blue} />
            <circle cx={px} cy={validation[i]} r="5" fill={colors.red} />
          </g>
        ))}
        <line
          x1="440"
          y1="82"
          x2="472"
          y2="82"
          stroke={colors.blue}
          strokeWidth="4"
        />
        <text x="480" y="87" fontSize="14" fill={colors.ink}>
          训练集
        </text>
        <line
          x1="548"
          y1="82"
          x2="580"
          y2="82"
          stroke={colors.red}
          strokeWidth="4"
        />
        <text x="588" y="87" fontSize="14" fill={colors.ink}>
          验证集
        </text>
        <path
          d="M 505 182 C 540 154 570 135 606 121"
          fill="none"
          stroke={colors.amber}
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <rect
          x="468"
          y="225"
          width="172"
          height="36"
          rx="10"
          fill={colors.paleAmber}
        />
        <text
          x="554"
          y="248"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={colors.amber}
        >
          留意泛化表现
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        示意曲线：训练损失还在下降时，验证损失回升，说明继续训练未必改善新样本表现。概念参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_multilayer-perceptrons/underfit-overfit.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的欠拟合与过拟合
        </a>
        。
      </figcaption>
    </figure>
  );
}
