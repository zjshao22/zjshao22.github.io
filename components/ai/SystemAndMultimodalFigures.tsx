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

export function RagPipelineFigure() {
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 920 340"
        className="h-auto w-full"
        role="img"
        aria-label="检索增强生成（RAG）全流程：文档切块并向量化存入知识库，用户查询经向量检索召回最相关切块，组装增强提示送入大模型，输出带证据引用的回答"
      >
        <defs>
          <marker
            id="rag-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.line} />
          </marker>
        </defs>

        <text
          x="460"
          y="26"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill={c.ink}
        >
          检索增强生成（RAG）：从外部证据到可靠回答
        </text>

        {/* 阶段 1：知识库准备 */}
        <g transform="translate(30, 50)">
          <rect
            width="250"
            height="110"
            rx="12"
            fill="#f8fafc"
            stroke={c.grid}
            strokeWidth="1.5"
          />
          <text
            x="125"
            y="26"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.ink}
          >
            ① 离线准备：切块与向量化
          </text>
          <rect
            x="15"
            y="42"
            width="100"
            height="52"
            rx="6"
            fill={c.paleBlue}
            stroke={c.blue}
            strokeWidth="1"
          />
          <text
            x="65"
            y="64"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.ink}
          >
            原始知识手册
          </text>
          <text x="65" y="82" textAnchor="middle" fontSize="11" fill={c.muted}>
            规则/通知/专有文档
          </text>

          <path
            d="M 120 68 L 140 68"
            stroke={c.line}
            strokeWidth="1.5"
            markerEnd="url(#rag-arrow)"
          />

          <rect
            x="145"
            y="42"
            width="90"
            height="52"
            rx="6"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1"
          />
          <text
            x="190"
            y="64"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.ink}
          >
            重叠切块
          </text>
          <text x="190" y="82" textAnchor="middle" fontSize="11" fill={c.muted}>
            Chunk + 向量嵌入
          </text>
        </g>

        {/* 向量知识库 */}
        <g transform="translate(325, 50)">
          <rect
            width="200"
            height="110"
            rx="12"
            fill="#f8fafc"
            stroke={c.grid}
            strokeWidth="1.5"
          />
          <text
            x="100"
            y="26"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.ink}
          >
            ② 向量数据库检索
          </text>
          <circle
            cx="50"
            cy="70"
            r="16"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="75"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.violet}
          >
            d₁
          </text>
          <circle
            cx="100"
            cy="65"
            r="16"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1.5"
          />
          <text
            x="100"
            y="70"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.violet}
          >
            d₂
          </text>
          <circle
            cx="150"
            cy="75"
            r="16"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1.5"
          />
          <text
            x="150"
            y="80"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.violet}
          >
            d₃
          </text>
          <text
            x="100"
            y="102"
            textAnchor="middle"
            fontSize="11"
            fill={c.muted}
          >
            余弦相似度计算与 Top-k 召回
          </text>
        </g>

        {/* 连接线：准备 -> 知识库 */}
        <path
          d="M 280 105 L 320 105"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#rag-arrow)"
        />

        {/* 下半部分：在线查询与回答 */}
        <g transform="translate(30, 195)">
          <rect
            width="170"
            height="100"
            rx="10"
            fill={c.paleBlue}
            stroke={c.blue}
            strokeWidth="1.5"
          />
          <text
            x="85"
            y="30"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={c.ink}
          >
            ③ 用户查询
          </text>
          <text x="85" y="56" textAnchor="middle" fontSize="12" fill={c.ink}>
            “本周日能去借书吗？”
          </text>
          <text x="85" y="80" textAnchor="middle" fontSize="11" fill={c.blue}>
            查询向量 q
          </text>
        </g>

        {/* 查询到向量库的箭头 */}
        <path
          d="M 200 245 L 380 245 L 380 165"
          fill="none"
          stroke={c.blue}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#rag-arrow)"
        />

        {/* 召回切块拼入 Prompt */}
        <g transform="translate(420, 195)">
          <rect
            width="220"
            height="100"
            rx="10"
            fill={c.paleAmber}
            stroke={c.amber}
            strokeWidth="1.5"
          />
          <text
            x="110"
            y="26"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={c.amber}
          >
            ④ 增强提示注入
          </text>
          <text x="110" y="50" textAnchor="middle" fontSize="11" fill={c.ink}>
            [参考资料] 临时闭馆通知...
          </text>
          <text x="110" y="70" textAnchor="middle" fontSize="11" fill={c.ink}>
            [用户问题] 本周日借书？
          </text>
          <text x="110" y="88" textAnchor="middle" fontSize="10" fill={c.muted}>
            约束：严禁编造，必须引用来源
          </text>
        </g>

        {/* 向量库到 Prompt 的箭头 */}
        <path
          d="M 450 160 L 450 190"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#rag-arrow)"
        />

        {/* 大模型生成与核验 */}
        <g transform="translate(685, 195)">
          <rect
            width="205"
            height="100"
            rx="10"
            fill={c.paleGreen}
            stroke={c.green}
            strokeWidth="1.5"
          />
          <text
            x="102"
            y="26"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={c.green}
          >
            ⑤ 生成回答与来源核验
          </text>
          <text
            x="102"
            y="52"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.ink}
          >
            “本周日临时闭馆，无法借书 [D2]”
          </text>
          <text x="102" y="74" textAnchor="middle" fontSize="10" fill={c.muted}>
            每句结论对应具体切块
          </text>
          <text x="102" y="90" textAnchor="middle" fontSize="10" fill={c.red}>
            核查：排除伪引用与过度推断
          </text>
        </g>

        {/* Prompt 到模型的箭头 */}
        <path
          d="M 640 245 L 680 245"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#rag-arrow)"
        />
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        检索增强生成将“闭卷猜测”转变为“开卷答题”：外部资料经过切块与向量化形成索引，模型在可见证据支持下生成回答并标注出处。
      </figcaption>
    </figure>
  );
}

export function AgentLoopFigure() {
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 920 340"
        className="h-auto w-full"
        role="img"
        aria-label="智能体 ReAct 循环：大模型分析当前状态，生成结构化工具调用；沙盒执行器拦截并执行，将真实观察返回上下文；状态机循环迭代直到满足完成断言或预算耗尽"
      >
        <defs>
          <marker
            id="agent-arrow"
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
            id="agent-blue-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.blue} />
          </marker>
        </defs>

        <text
          x="460"
          y="26"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill={c.ink}
        >
          智能体（Agent）：思考、行动与观察的闭环（ReAct）
        </text>

        {/* 核心节点：模型思考与决策 */}
        <g transform="translate(50, 70)">
          <rect
            width="240"
            height="180"
            rx="12"
            fill={c.paleBlue}
            stroke={c.blue}
            strokeWidth="1.5"
          />
          <text
            x="120"
            y="30"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.ink}
          >
            大语言模型（决策中枢）
          </text>
          <rect
            x="15"
            y="45"
            width="210"
            height="40"
            rx="6"
            fill="#ffffff"
            stroke={c.blue}
            strokeWidth="1"
          />
          <text
            x="120"
            y="65"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.blue}
          >
            Thought（思考）
          </text>
          <text x="120" y="80" textAnchor="middle" fontSize="10" fill={c.muted}>
            分析已知状态与剩余目标
          </text>

          <rect
            x="15"
            y="100"
            width="210"
            height="65"
            rx="6"
            fill="#ffffff"
            stroke={c.blue}
            strokeWidth="1"
          />
          <text
            x="120"
            y="120"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.blue}
          >
            Action（结构化请求）
          </text>
          <text
            x="120"
            y="140"
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill={c.ink}
          >
            {'call: read_file("data.txt")'}
          </text>
          <text
            x="120"
            y="156"
            textAnchor="middle"
            fontSize="10"
            fill={c.muted}
          >
            严格输出 JSON Schema 参数
          </text>
        </g>

        {/* 中间屏障：沙盒与权限校验 */}
        <g transform="translate(360, 60)">
          <rect
            width="200"
            height="200"
            rx="12"
            fill="#fffbeb"
            stroke={c.amber}
            strokeWidth="1.5"
          />
          <text
            x="100"
            y="30"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.amber}
          >
            执行器与安全屏障
          </text>
          <text x="100" y="60" textAnchor="middle" fontSize="11" fill={c.ink}>
            ✓ 工具白名单检查
          </text>
          <text x="100" y="85" textAnchor="middle" fontSize="11" fill={c.ink}>
            ✓ 参数强类型与范围校验
          </text>
          <text x="100" y="110" textAnchor="middle" fontSize="11" fill={c.ink}>
            ✓ 隔离沙盒文件目录
          </text>
          <text x="100" y="135" textAnchor="middle" fontSize="11" fill={c.red}>
            ✗ 拒绝任意 Shell / eval
          </text>
          <rect
            x="20"
            y="150"
            width="160"
            height="36"
            rx="6"
            fill="#ffffff"
            stroke={c.amber}
            strokeWidth="1"
          />
          <text
            x="100"
            y="172"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.amber}
          >
            安全拦截与审计日志
          </text>
        </g>

        {/* 右侧：真实环境与工具执行 */}
        <g transform="translate(630, 70)">
          <rect
            width="240"
            height="180"
            rx="12"
            fill={c.paleGreen}
            stroke={c.green}
            strokeWidth="1.5"
          />
          <text
            x="120"
            y="30"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.green}
          >
            外部真实环境（Tools）
          </text>
          <rect
            x="15"
            y="45"
            width="210"
            height="40"
            rx="6"
            fill="#ffffff"
            stroke={c.green}
            strokeWidth="1"
          />
          <text
            x="120"
            y="65"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.ink}
          >
            本地计算 / 确定性脚本
          </text>
          <text x="120" y="80" textAnchor="middle" fontSize="10" fill={c.muted}>
            add(12, 7) → 19
          </text>

          <rect
            x="15"
            y="95"
            width="210"
            height="65"
            rx="6"
            fill="#ffffff"
            stroke={c.green}
            strokeWidth="1"
          />
          <text
            x="120"
            y="118"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.green}
          >
            Observation（观察返回）
          </text>
          <text
            x="120"
            y="136"
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill={c.ink}
          >
            {`{"ok": true, "result": "12, 7"}`}
          </text>
          <text
            x="120"
            y="152"
            textAnchor="middle"
            fontSize="10"
            fill={c.muted}
          >
            真实结果注回模型前文
          </text>
        </g>

        {/* Action 走向执行器 */}
        <path
          d="M 290 195 L 355 195"
          stroke={c.blue}
          strokeWidth="2"
          markerEnd="url(#agent-blue-arrow)"
        />

        {/* 执行器走向外部环境 */}
        <path
          d="M 560 160 L 625 160"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#agent-arrow)"
        />

        {/* Observation 返回模型的闭环回路 */}
        <path
          d="M 750 250 L 750 295 L 170 295 L 170 255"
          fill="none"
          stroke={c.green}
          strokeWidth="2"
          strokeDasharray="5 5"
          markerEnd="url(#agent-arrow)"
        />
        <text
          x="460"
          y="288"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={c.green}
        >
          循环继续：更新上下文状态（受最大预算 Max Budget 约束）
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        智能体通过“思考—行动—观察”循环解决多步任务。自然语言声明不等于系统真实动作；必须通过受控沙盒执行，并在达到完成断言或预算上限时安全终止。
      </figcaption>
    </figure>
  );
}

export function VisionLanguageFigure() {
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 920 340"
        className="h-auto w-full"
        role="img"
        aria-label="视觉语言模型（VLM）处理流水线：图像网格切分为 Patch 序列，经线性投影对齐到语言嵌入空间，与文本词元拼接后送入统一 Transformer 进行自注意力计算"
      >
        <defs>
          <marker
            id="vlm-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.line} />
          </marker>
        </defs>

        <text
          x="460"
          y="26"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill={c.ink}
        >
          视觉语言模型（VLM）：图像切块、跨模态对齐与联合注意力
        </text>

        {/* 左侧：图像切块 */}
        <g transform="translate(30, 60)">
          <rect
            width="140"
            height="140"
            rx="8"
            fill="#f1f5f9"
            stroke={c.grid}
            strokeWidth="1.5"
          />
          <text
            x="70"
            y="20"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill={c.ink}
          >
            输入图像 (4×4)
          </text>

          {/* 4 个 2x2 Patch */}
          <rect
            x="15"
            y="35"
            width="50"
            height="45"
            fill={c.paleBlue}
            stroke={c.blue}
            strokeWidth="1"
          />
          <text
            x="40"
            y="62"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.blue}
          >
            P₁
          </text>

          <rect
            x="75"
            y="35"
            width="50"
            height="45"
            fill="#e2e8f0"
            stroke={c.muted}
            strokeWidth="1"
          />
          <text
            x="100"
            y="62"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.muted}
          >
            P₂
          </text>

          <rect
            x="15"
            y="85"
            width="50"
            height="45"
            fill="#e2e8f0"
            stroke={c.muted}
            strokeWidth="1"
          />
          <text
            x="40"
            y="112"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.muted}
          >
            P₃
          </text>

          <rect
            x="75"
            y="85"
            width="50"
            height="45"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1"
          />
          <text
            x="100"
            y="112"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={c.violet}
          >
            P₄
          </text>

          <text x="70" y="155" textAnchor="middle" fontSize="11" fill={c.muted}>
            切分成网格 Patch 序列
          </text>
        </g>

        {/* 箭头走向投影层 */}
        <path
          d="M 180 130 L 225 130"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#vlm-arrow)"
        />

        {/* 投影层（Projector） */}
        <g transform="translate(235, 65)">
          <rect
            width="170"
            height="130"
            rx="10"
            fill={c.paleViolet}
            stroke={c.violet}
            strokeWidth="1.5"
          />
          <text
            x="85"
            y="28"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={c.violet}
          >
            跨模态投影层 (Projector)
          </text>
          <rect
            x="15"
            y="42"
            width="140"
            height="32"
            rx="5"
            fill="#ffffff"
            stroke={c.violet}
            strokeWidth="1"
          />
          <text x="85" y="62" textAnchor="middle" fontSize="11" fill={c.ink}>
            线性变换 / 小型 MLP
          </text>
          <text x="85" y="95" textAnchor="middle" fontSize="10" fill={c.ink}>
            视觉维度 → 文本隐藏维度
          </text>
          <text x="85" y="115" textAnchor="middle" fontSize="10" fill={c.muted}>
            加 2D 位置编码 (Pos Enc)
          </text>
        </g>

        {/* 箭头走向词元序列 */}
        <path
          d="M 415 130 L 460 130"
          stroke={c.line}
          strokeWidth="1.5"
          markerEnd="url(#vlm-arrow)"
        />

        {/* 联合词元序列与 Transformer */}
        <g transform="translate(470, 50)">
          <rect
            width="420"
            height="240"
            rx="12"
            fill="#f8fafc"
            stroke={c.grid}
            strokeWidth="1.5"
          />
          <text
            x="210"
            y="26"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.ink}
          >
            统一自回归 Transformer 处理流水线
          </text>

          {/* 拼接序列 */}
          <g transform="translate(15, 45)">
            <rect
              x="0"
              y="0"
              width="45"
              height="35"
              rx="6"
              fill={c.paleBlue}
              stroke={c.blue}
            />
            <text x="22" y="22" textAnchor="middle" fontSize="11" fill={c.blue}>
              v₁
            </text>

            <rect
              x="50"
              y="0"
              width="45"
              height="35"
              rx="6"
              fill={c.paleBlue}
              stroke={c.blue}
            />
            <text x="72" y="22" textAnchor="middle" fontSize="11" fill={c.blue}>
              v₂
            </text>

            <rect
              x="100"
              y="0"
              width="45"
              height="35"
              rx="6"
              fill={c.paleBlue}
              stroke={c.blue}
            />
            <text
              x="122"
              y="22"
              textAnchor="middle"
              fontSize="11"
              fill={c.blue}
            >
              v₃
            </text>

            <rect
              x="150"
              y="0"
              width="45"
              height="35"
              rx="6"
              fill={c.paleBlue}
              stroke={c.blue}
            />
            <text
              x="172"
              y="22"
              textAnchor="middle"
              fontSize="11"
              fill={c.blue}
            >
              v₄
            </text>

            <text
              x="97"
              y="52"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={c.blue}
            >
              视觉词元 (Visual Tokens)
            </text>

            <text
              x="208"
              y="22"
              textAnchor="middle"
              fontSize="16"
              fill={c.muted}
            >
              +
            </text>

            <rect
              x="225"
              y="0"
              width="50"
              height="35"
              rx="6"
              fill={c.paleGreen}
              stroke={c.green}
            />
            <text
              x="250"
              y="22"
              textAnchor="middle"
              fontSize="11"
              fill={c.green}
            >
              “图中”
            </text>

            <rect
              x="280"
              y="0"
              width="50"
              height="35"
              rx="6"
              fill={c.paleGreen}
              stroke={c.green}
            />
            <text
              x="305"
              y="22"
              textAnchor="middle"
              fontSize="11"
              fill={c.green}
            >
              “最亮”
            </text>

            <rect
              x="335"
              y="0"
              width="50"
              height="35"
              rx="6"
              fill={c.paleGreen}
              stroke={c.green}
            />
            <text
              x="360"
              y="22"
              textAnchor="middle"
              fontSize="11"
              fill={c.green}
            >
              “在哪”
            </text>

            <text
              x="305"
              y="52"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={c.green}
            >
              文本词元 (Text Tokens)
            </text>
          </g>

          {/* 联合自注意力 */}
          <rect
            x="25"
            y="120"
            width="370"
            height="45"
            rx="8"
            fill={c.paleAmber}
            stroke={c.amber}
            strokeWidth="1.5"
          />
          <text
            x="210"
            y="142"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill={c.amber}
          >
            多头联合自注意力（Cross-Modal Self-Attention）
          </text>
          <text x="210" y="157" textAnchor="middle" fontSize="10" fill={c.ink}>
            文本查询 q 与图像视觉键 k 计算匹配分，读取视觉值 v
          </text>

          {/* 输出生成 */}
          <rect
            x="50"
            y="180"
            width="320"
            height="40"
            rx="8"
            fill="#ffffff"
            stroke={c.green}
            strokeWidth="1.5"
          />
          <text
            x="210"
            y="205"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={c.ink}
          >
            下一词元预测：“在” → “右下角” → [结束]
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        视觉语言模型将图像切片展开为视觉词元序列，投影到文本表示空间后联合自注意力计算，实现“看图回答”。
      </figcaption>
    </figure>
  );
}
