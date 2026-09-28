import type { ReactNode } from "react";

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
  line: "#94a3b8",
  grid: "#cbd5e1",
};

const ReferenceLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    className="underline underline-offset-2"
    href={href}
    target="_blank"
    rel="noreferrer"
  >
    {children}
  </a>
);

export function AIDataRepresentationFigure() {
  const pixels = [
    [12, 24, 218, 233],
    [18, 196, 229, 240],
    [16, 33, 221, 235],
  ];
  const tokens = ["猫", "追", "球"];
  const wave = [
    165, 147, 169, 122, 172, 187, 132, 156, 112, 178, 164, 145, 181, 126, 163,
    154,
  ];
  const points = wave.map((y, i) => `${640 + i * 8.5},${y}`).join(" ");

  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 820 330"
        className="h-auto w-full"
        role="img"
        aria-label="人工智能输入数据表示示意：图像被表示为像素矩阵，结构化数据被表示为表格行列，文字被切分成词元编号，声音被表示为随时间变化的采样值"
      >
        <text
          x="410"
          y="27"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          同一个现实世界，可以变成不同的数据表示
        </text>
        <g>
          <rect
            x="18"
            y="48"
            width="188"
            height="218"
            rx="14"
            fill="#f8fafc"
            stroke={c.grid}
          />
          <text
            x="112"
            y="74"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={c.blue}
          >
            图像：像素矩阵
          </text>
          {pixels.map((row, r) =>
            row.map((value, col) => (
              <g key={`pixel-${r}-${col}`}>
                <rect
                  x={68 + col * 28}
                  y={91 + r * 28}
                  width="26"
                  height="26"
                  rx="3"
                  fill={value > 128 ? c.paleBlue : "#e2e8f0"}
                  stroke={c.blue}
                />
                <text
                  x={81 + col * 28}
                  y={109 + r * 28}
                  textAnchor="middle"
                  fontSize="9"
                  fill={c.ink}
                >
                  {value}
                </text>
              </g>
            )),
          )}
          <text x="112" y="202" textAnchor="middle" fontSize="12" fill={c.ink}>
            每个数对应一个像素亮度
          </text>
          <text
            x="112"
            y="224"
            textAnchor="middle"
            fontSize="11"
            fill={c.muted}
          >
            彩色图像还包含颜色通道
          </text>
        </g>

        <g>
          <rect
            x="217"
            y="48"
            width="188"
            height="218"
            rx="14"
            fill="#f8fafc"
            stroke={c.grid}
          />
          <text
            x="311"
            y="74"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={c.violet}
          >
            表格：行与特征列
          </text>
          <rect
            x="237"
            y="91"
            width="148"
            height="30"
            rx="5"
            fill={c.paleViolet}
          />
          <text x="260" y="111" textAnchor="middle" fontSize="10" fill={c.ink}>
            温度
          </text>
          <text x="310" y="111" textAnchor="middle" fontSize="10" fill={c.ink}>
            湿度
          </text>
          <text x="360" y="111" textAnchor="middle" fontSize="10" fill={c.ink}>
            降雨
          </text>
          {[
            ["18°", "72%", "有"],
            ["25°", "40%", "无"],
            ["21°", "85%", "有"],
          ].map((row, r) => (
            <g key={`table-${r}`}>
              <rect
                x="237"
                y={125 + r * 29}
                width="148"
                height="26"
                fill="white"
                stroke={c.grid}
              />
              {row.map((value, col) => (
                <text
                  key={`${r}-${col}`}
                  x={260 + col * 50}
                  y={142 + r * 29}
                  textAnchor="middle"
                  fontSize="11"
                  fill={c.ink}
                >
                  {value}
                </text>
              ))}
            </g>
          ))}
          <text
            x="311"
            y="224"
            textAnchor="middle"
            fontSize="11"
            fill={c.muted}
          >
            一行是一条记录
          </text>
        </g>

        <g>
          <rect
            x="416"
            y="48"
            width="188"
            height="218"
            rx="14"
            fill="#f8fafc"
            stroke={c.grid}
          />
          <text
            x="510"
            y="74"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={c.green}
          >
            文字：词元与编号
          </text>
          {tokens.map((token, i) => (
            <g key={token}>
              <rect
                x={434 + i * 52}
                y="102"
                width="46"
                height="42"
                rx="7"
                fill={c.paleGreen}
                stroke={c.green}
              />
              <text
                x={457 + i * 52}
                y="128"
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill={c.ink}
              >
                {token}
              </text>
              <text
                x={457 + i * 52}
                y="164"
                textAnchor="middle"
                fontSize="10"
                fill={c.muted}
              >
                {[508, 177, 921][i]}
              </text>
            </g>
          ))}
          <text x="510" y="197" textAnchor="middle" fontSize="11" fill={c.ink}>
            猫 追 球 → 508, 177, 921
          </text>
          <text
            x="510"
            y="220"
            textAnchor="middle"
            fontSize="11"
            fill={c.muted}
          >
            编号是词表索引，不是含义分数
          </text>
        </g>

        <g>
          <rect
            x="615"
            y="48"
            width="188"
            height="218"
            rx="14"
            fill="#f8fafc"
            stroke={c.grid}
          />
          <text
            x="709"
            y="74"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={c.amber}
          >
            声音：时间序列
          </text>
          <line x1="636" y1="163" x2="782" y2="163" stroke={c.grid} />
          <polyline
            points={points}
            fill="none"
            stroke={c.amber}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {wave.map((y, i) => (
            <circle key={i} cx={640 + i * 8.5} cy={y} r="2.2" fill={c.amber} />
          ))}
          <text x="709" y="204" textAnchor="middle" fontSize="11" fill={c.ink}>
            记录不同时间的声音强弱
          </text>
          <text
            x="709"
            y="226"
            textAnchor="middle"
            fontSize="11"
            fill={c.muted}
          >
            采样频率影响声音细节
          </text>
        </g>

        <path d="M 65 292 H 755" stroke={c.line} strokeWidth="2" />
        <path d="M 755 292 L 745 286 L 745 298 Z" fill={c.line} />
        <text
          x="410"
          y="316"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill={c.ink}
        >
          模型处理的是被采集、编码后的信息；表示方式决定它能利用哪些线索
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        四类表示为教学示意，依据
        <ReferenceLink href="https://zh-v2.d2l.ai/chapter_preliminaries/pandas.html">
          《动手学深度学习》的数据预处理
        </ReferenceLink>
        与
        <ReferenceLink href="https://developers.google.com/machine-learning/crash-course/overfitting/data-characteristics">
          Google 机器学习课程的数据类型说明
        </ReferenceLink>
        重绘。
      </figcaption>
    </figure>
  );
}

export function AIMethodsFigure() {
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 900 340"
        className="h-auto w-full"
        role="img"
        aria-label="三种人工智能解题思路对比：规则方法由人写出条件，搜索方法在状态图中规划路径，机器学习方法从样本中调整模型再进行预测"
      >
        <text
          x="450"
          y="28"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          AI 可以用不同路线处理同一类问题
        </text>
        {[
          {
            x: 18,
            title: "规则系统",
            color: c.blue,
            pale: c.paleBlue,
            tag: "人把条件写清楚",
          },
          {
            x: 311,
            title: "搜索与规划",
            color: c.violet,
            pale: c.paleViolet,
            tag: "在候选状态中找路径",
          },
          {
            x: 604,
            title: "机器学习",
            color: c.green,
            pale: c.paleGreen,
            tag: "由样本调整模型参数",
          },
        ].map((item) => (
          <g key={item.title}>
            <rect
              x={item.x}
              y="51"
              width="278"
              height="231"
              rx="15"
              fill="#f8fafc"
              stroke={item.color}
              strokeWidth="1.5"
            />
            <rect
              x={item.x + 1}
              y="52"
              width="276"
              height="43"
              rx="14"
              fill={item.pale}
            />
            <text
              x={item.x + 139}
              y="80"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill={item.color}
            >
              {item.title}
            </text>
            <text
              x={item.x + 139}
              y="260"
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill={c.ink}
            >
              {item.tag}
            </text>
          </g>
        ))}

        <rect
          x="42"
          y="116"
          width="82"
          height="48"
          rx="9"
          fill="white"
          stroke={c.grid}
        />
        <text x="83" y="136" textAnchor="middle" fontSize="11" fill={c.ink}>
          检测到降雨
        </text>
        <text x="83" y="153" textAnchor="middle" fontSize="10" fill={c.muted}>
          输入条件
        </text>
        <path d="M 128 140 H 159" stroke={c.line} strokeWidth="2" />
        <path d="M 159 140 L 151 135 L 151 145 Z" fill={c.line} />
        <rect
          x="165"
          y="116"
          width="105"
          height="48"
          rx="9"
          fill={c.paleAmber}
          stroke={c.amber}
        />
        <text
          x="217"
          y="136"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={c.ink}
        >
          IF 下雨 THEN
        </text>
        <text x="217" y="153" textAnchor="middle" fontSize="11" fill={c.ink}>
          建议带伞
        </text>

        <g stroke={c.grid} strokeWidth="2">
          <line x1="347" y1="143" x2="400" y2="118" />
          <line x1="347" y1="143" x2="400" y2="174" />
          <line x1="408" y1="118" x2="458" y2="143" />
          <line x1="408" y1="174" x2="458" y2="143" />
          <line x1="467" y1="143" x2="520" y2="118" />
          <line x1="467" y1="143" x2="520" y2="174" />
        </g>
        {[
          { x: 342, y: 143, label: "起点", fill: c.paleBlue },
          { x: 404, y: 118, label: "A", fill: "white" },
          { x: 404, y: 174, label: "B", fill: "white" },
          { x: 462, y: 143, label: "C", fill: c.paleViolet },
          { x: 524, y: 118, label: "终点", fill: c.paleGreen },
          { x: 524, y: 174, label: "D", fill: "white" },
        ].map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r="17"
              fill={node.fill}
              stroke={i === 3 ? c.violet : c.grid}
              strokeWidth="1.5"
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fontSize="9"
              fill={c.ink}
            >
              {node.label}
            </text>
          </g>
        ))}
        <path
          d="M 479 138 L 516 120"
          fill="none"
          stroke={c.violet}
          strokeWidth="3"
        />
        <text x="450" y="220" textAnchor="middle" fontSize="11" fill={c.muted}>
          比较可行路线与代价，选出一条方案
        </text>

        <rect
          x="629"
          y="116"
          width="66"
          height="48"
          rx="9"
          fill="white"
          stroke={c.grid}
        />
        <text x="662" y="136" textAnchor="middle" fontSize="11" fill={c.ink}>
          许多样本
        </text>
        <text x="662" y="153" textAnchor="middle" fontSize="10" fill={c.muted}>
          例子与反馈
        </text>
        <path d="M 699 140 H 722" stroke={c.line} strokeWidth="2" />
        <path d="M 722 140 L 714 135 L 714 145 Z" fill={c.line} />
        <rect
          x="728"
          y="116"
          width="62"
          height="48"
          rx="9"
          fill={c.paleGreen}
          stroke={c.green}
        />
        <text
          x="759"
          y="145"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={c.ink}
        >
          模型
        </text>
        <path d="M 794 140 H 813" stroke={c.line} strokeWidth="2" />
        <path d="M 813 140 L 805 135 L 805 145 Z" fill={c.line} />
        <rect
          x="819"
          y="116"
          width="64"
          height="48"
          rx="9"
          fill="white"
          stroke={c.grid}
        />
        <text x="851" y="145" textAnchor="middle" fontSize="11" fill={c.ink}>
          新输入
        </text>
        <text x="750" y="220" textAnchor="middle" fontSize="11" fill={c.muted}>
          从训练中学得的参数用于新样本
        </text>

        <rect
          x="109"
          y="300"
          width="682"
          height="27"
          rx="9"
          fill={c.paleAmber}
        />
        <text
          x="450"
          y="319"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={c.amber}
        >
          实际系统常把规则、搜索和学习组合起来；方法名称说明主要思路，不是彼此隔绝的盒子
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        三条路线是入门分类，不涵盖所有 AI 方法；课程组织参考
        <ReferenceLink href="https://bulletin.stanford.edu/courses/1057301/tab-aoYks">
          Stanford CS221 的人工智能基础主题
        </ReferenceLink>
        并重新绘制。
      </figcaption>
    </figure>
  );
}

export function LearningParadigmsFigure() {
  const panels = [
    {
      x: 16,
      title: "监督学习",
      color: c.blue,
      pale: c.paleBlue,
      top: "带答案的样本",
      bottom: "从答案中学习映射",
    },
    {
      x: 311,
      title: "无监督学习",
      color: c.violet,
      pale: c.paleViolet,
      top: "没有目标答案",
      bottom: "从数据中找结构",
    },
    {
      x: 606,
      title: "强化学习",
      color: c.green,
      pale: c.paleGreen,
      top: "行动得到反馈",
      bottom: "从长期回报改进行动",
    },
  ];
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 900 330"
        className="h-auto w-full"
        role="img"
        aria-label="三种机器学习方式：监督学习使用特征和标签，比较预测与答案；无监督学习从未标记样本中发现群组；强化学习中的智能体与环境反复交互并根据奖励调整策略"
      >
        <text
          x="450"
          y="28"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          关键区别：训练信号从哪里来？
        </text>
        {panels.map((panel) => (
          <g key={panel.title}>
            <rect
              x={panel.x}
              y="48"
              width="278"
              height="248"
              rx="15"
              fill="#f8fafc"
              stroke={panel.color}
              strokeWidth="1.5"
            />
            <rect
              x={panel.x + 1}
              y="49"
              width="276"
              height="42"
              rx="14"
              fill={panel.pale}
            />
            <text
              x={panel.x + 139}
              y="76"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill={panel.color}
            >
              {panel.title}
            </text>
            <text
              x={panel.x + 139}
              y="272"
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill={c.ink}
            >
              {panel.bottom}
            </text>
          </g>
        ))}

        <text x="155" y="114" textAnchor="middle" fontSize="12" fill={c.ink}>
          特征 x + 标签 y
        </text>
        <rect
          x="41"
          y="128"
          width="86"
          height="48"
          rx="9"
          fill="white"
          stroke={c.grid}
        />
        <text x="84" y="148" textAnchor="middle" fontSize="11" fill={c.ink}>
          带答案的例子
        </text>
        <text x="84" y="165" textAnchor="middle" fontSize="10" fill={c.muted}>
          (x, y)
        </text>
        <path d="M 131 152 H 163" stroke={c.line} strokeWidth="2" />
        <path d="M 163 152 L 155 147 L 155 157 Z" fill={c.line} />
        <rect
          x="170"
          y="128"
          width="81"
          height="48"
          rx="9"
          fill={c.paleBlue}
          stroke={c.blue}
        />
        <text
          x="210"
          y="157"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={c.ink}
        >
          模型
        </text>
        <path
          d="M 211 184 V 207 H 106 V 184"
          fill="none"
          stroke={c.blue}
          strokeWidth="2"
        />
        <text x="158" y="227" textAnchor="middle" fontSize="11" fill={c.muted}>
          预测和真实答案比较
        </text>

        <text x="450" y="114" textAnchor="middle" fontSize="12" fill={c.ink}>
          样本有相似，也有差异
        </text>
        {[
          [367, 143, c.blue],
          [390, 160, c.blue],
          [374, 183, c.blue],
          [446, 142, c.violet],
          [466, 162, c.violet],
          [449, 185, c.violet],
          [520, 145, c.green],
          [540, 165, c.green],
          [518, 187, c.green],
        ].map(([x, y, color], i) => (
          <circle
            key={i}
            cx={Number(x)}
            cy={Number(y)}
            r="6"
            fill={String(color)}
          />
        ))}
        <ellipse
          cx="378"
          cy="161"
          rx="28"
          ry="37"
          fill="none"
          stroke={c.blue}
          strokeDasharray="4 4"
        />
        <ellipse
          cx="455"
          cy="162"
          rx="27"
          ry="38"
          fill="none"
          stroke={c.violet}
          strokeDasharray="4 4"
        />
        <ellipse
          cx="529"
          cy="165"
          rx="27"
          ry="38"
          fill="none"
          stroke={c.green}
          strokeDasharray="4 4"
        />
        <text x="450" y="227" textAnchor="middle" fontSize="11" fill={c.muted}>
          群组需要人结合任务来解释
        </text>

        <rect
          x="638"
          y="132"
          width="73"
          height="49"
          rx="9"
          fill={c.paleGreen}
          stroke={c.green}
        />
        <text
          x="674"
          y="153"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={c.ink}
        >
          智能体
        </text>
        <text x="674" y="170" textAnchor="middle" fontSize="10" fill={c.muted}>
          选行动
        </text>
        <path d="M 714 156 H 758" stroke={c.green} strokeWidth="2" />
        <path d="M 758 156 L 750 151 L 750 161 Z" fill={c.green} />
        <rect
          x="765"
          y="132"
          width="91"
          height="49"
          rx="9"
          fill="white"
          stroke={c.grid}
        />
        <text x="810" y="153" textAnchor="middle" fontSize="11" fill={c.ink}>
          环境变化
        </text>
        <text x="810" y="170" textAnchor="middle" fontSize="10" fill={c.muted}>
          返回奖励
        </text>
        <path
          d="M 810 186 C 810 218 672 218 674 186"
          fill="none"
          stroke={c.green}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <text x="750" y="241" textAnchor="middle" fontSize="11" fill={c.muted}>
          奖励可延迟，需考虑长期结果
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        图示聚焦监督、无监督和强化学习三类反馈机制；定义与示例参考
        <ReferenceLink href="https://developers.google.com/machine-learning/intro-to-ml/what-is-ml">
          Google 的机器学习入门课程
        </ReferenceLink>
        并重新绘制。
      </figcaption>
    </figure>
  );
}
