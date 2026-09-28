const c = {
  ink: "#172554",
  muted: "#64748b",
  blue: "#2563eb",
  paleBlue: "#dbeafe",
  violet: "#7c3aed",
  paleViolet: "#ede9fe",
  green: "#15803d",
  paleGreen: "#dcfce7",
  paleAmber: "#fef3c7",
  line: "#94a3b8",
  grid: "#cbd5e1",
};

export function NeuralNetworkFigure() {
  const layers = [
    {
      x: 115,
      title: "输入",
      nodes: [
        { y: 105, label: "x₁" },
        { y: 205, label: "x₂" },
      ],
    },
    {
      x: 365,
      title: "隐藏层",
      nodes: [
        { y: 82, label: "h₁" },
        { y: 155, label: "h₂" },
        { y: 228, label: "h₃" },
      ],
    },
    { x: 615, title: "输出", nodes: [{ y: 155, label: "ŷ" }] },
  ];
  const edges = [
    ...layers[0].nodes.flatMap((a, ai) =>
      layers[1].nodes.map((b, bi) => ({
        x1: 145,
        y1: a.y,
        x2: 335,
        y2: b.y,
        key: `a${ai}-${bi}`,
      })),
    ),
    ...layers[1].nodes.map((a, ai) => ({
      x1: 395,
      y1: a.y,
      x2: 585,
      y2: 155,
      key: `b${ai}`,
    })),
  ];
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 760 330"
        className="h-auto w-full"
        role="img"
        aria-label="前馈神经网络示意图：两个输入数值连接到隐藏层的三个神经元，再汇总为一个输出；隐藏层节点进行加权求和和非线性激活"
      >
        <text
          x="380"
          y="30"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          从输入到输出：每一层都变换表示
        </text>
        {edges.map((edge) => (
          <line
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={c.grid}
            strokeWidth="2"
          />
        ))}
        {layers.map((layer, layerIndex) => (
          <g key={layer.title}>
            <text
              x={layer.x}
              y="280"
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill={c.ink}
            >
              {layer.title}
            </text>
            {layer.nodes.map((node) => {
              const fill =
                layerIndex === 0
                  ? c.paleBlue
                  : layerIndex === 1
                    ? c.paleViolet
                    : c.paleGreen;
              const stroke =
                layerIndex === 0
                  ? c.blue
                  : layerIndex === 1
                    ? c.violet
                    : c.green;
              return (
                <g key={node.label}>
                  <circle
                    cx={layer.x}
                    cy={node.y}
                    r="29"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2.5"
                  />
                  <text
                    x={layer.x}
                    y={node.y + 6}
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill={c.ink}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
        <rect
          x="254"
          y="292"
          width="252"
          height="27"
          rx="9"
          fill={c.paleViolet}
        />
        <text x="380" y="311" textAnchor="middle" fontSize="13" fill={c.violet}>
          加权求和 → ReLU 等非线性变换
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        示意图参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_multilayer-perceptrons/mlp.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的多层感知机
        </a>
        结构重新绘制；真实网络有更多单元和参数。
      </figcaption>
    </figure>
  );
}

export function ConvolutionFigure() {
  const cell = 32;
  const left = 38;
  const top = 79;
  const matrix = [
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
    [0, 1, 0, 0, 1],
    [0, 1, 0, 1, 1],
    [0, 0, 1, 1, 0],
  ];
  const out = [
    [-1, -1, 1, 1],
    [-2, 1, 1, -1],
    [-2, 2, -1, -1],
    [-1, 0, -1, 1],
  ];
  return (
    <figure className="my-7 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-6">
      <svg
        viewBox="0 0 760 360"
        className="h-auto w-full"
        role="img"
        aria-label="卷积扫描图：一个2乘2的边缘核覆盖5乘5像素矩阵的局部窗口，滑动时重复使用相同权重并得到4乘4特征图；输出数值由矩阵实际计算"
      >
        <text
          x="380"
          y="28"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill={c.ink}
        >
          同一组权重扫描局部区域，生成特征图
        </text>
        <text
          x="118"
          y="57"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={c.ink}
        >
          输入像素（5 × 5）
        </text>
        {matrix.map((row, r) =>
          row.map((value, col) => (
            <g key={`${r}-${col}`}>
              <rect
                x={left + col * cell}
                y={top + r * cell}
                width={cell}
                height={cell}
                fill={r < 2 && col < 2 ? c.paleBlue : "#f8fafc"}
                stroke={c.grid}
              />
              <text
                x={left + col * cell + cell / 2}
                y={top + r * cell + 22}
                textAnchor="middle"
                fontSize="14"
                fill={value ? c.ink : c.muted}
              >
                {value}
              </text>
            </g>
          )),
        )}
        <rect
          x={left - 2}
          y={top - 2}
          width={cell * 2 + 4}
          height={cell * 2 + 4}
          fill="none"
          stroke={c.blue}
          strokeWidth="3"
          rx="3"
        />

        <path d="M 211 155 H 258" stroke={c.line} strokeWidth="3" />
        <path d="M 258 155 L 246 148 L 246 162 Z" fill={c.line} />
        <text x="235" y="128" textAnchor="middle" fontSize="12" fill={c.muted}>
          <tspan x="235">逐项相乘</tspan>
          <tspan x="235" dy="16">
            再求和
          </tspan>
        </text>

        <text
          x="331"
          y="57"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={c.ink}
        >
          共享卷积核
        </text>
        {[
          [1, -1],
          [1, -1],
        ].map((row, r) =>
          row.map((value, col) => (
            <g key={`kernel-${r}-${col}`}>
              <rect
                x={295 + col * 36}
                y={top + r * 36}
                width="36"
                height="36"
                fill={c.paleViolet}
                stroke={c.violet}
              />
              <text
                x={313 + col * 36}
                y={top + r * 36 + 24}
                textAnchor="middle"
                fontSize="15"
                fontWeight="600"
                fill={c.ink}
              >
                {value}
              </text>
            </g>
          )),
        )}
        <text x="331" y="190" textAnchor="middle" fontSize="12" fill={c.muted}>
          K = [[1, −1], [1, −1]]
        </text>
        <path d="M 374 155 H 420" stroke={c.line} strokeWidth="3" />
        <path d="M 420 155 L 408 148 L 408 162 Z" fill={c.line} />

        <text
          x="516"
          y="57"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={c.ink}
        >
          输出特征图（4 × 4）
        </text>
        {out.map((row, r) =>
          row.map((value, col) => (
            <g key={`out-${r}-${col}`}>
              <rect
                x={444 + col * 36}
                y={top + r * 36}
                width="36"
                height="36"
                fill={
                  value > 0 ? c.paleGreen : value < 0 ? "#fee2e2" : "#f8fafc"
                }
                stroke={c.grid}
              />
              <text
                x={462 + col * 36}
                y={top + r * 36 + 24}
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill={value > 0 ? c.green : value < 0 ? "#b91c1c" : c.muted}
              >
                {value}
              </text>
            </g>
          )),
        )}
        <rect
          x="609"
          y="89"
          width="126"
          height="77"
          rx="12"
          fill={c.paleAmber}
          stroke="#b45309"
          strokeWidth="1.5"
        />
        <text
          x="672"
          y="116"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#92400e"
        >
          窗口每次移动
        </text>
        <text x="672" y="139" textAnchor="middle" fontSize="12" fill={c.ink}>
          同一组 K 重复使用
        </text>
        <text x="380" y="262" textAnchor="middle" fontSize="13" fill={c.ink}>
          蓝框是第一个窗口；对应左上角输出：0×1 + 0×(−1) + 0×1 + 1×(−1) = −1
        </text>
        <text x="380" y="301" textAnchor="middle" fontSize="13" fill={c.muted}>
          整幅输入上逐格计算，得到 4 × 4 特征图；颜色表示响应正负
        </text>
        <text x="380" y="334" textAnchor="middle" fontSize="12" fill={c.muted}>
          数值按本课的二值图像和边缘核计算
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        卷积窗口结构参考
        <a
          className="underline underline-offset-2"
          href="https://zh-v2.d2l.ai/chapter_convolutional-neural-networks/conv-layer.html"
          target="_blank"
          rel="noreferrer"
        >
          《动手学深度学习》的图像卷积
        </a>
        重新绘制；本图改用本课的边缘核并展示实际输出。
      </figcaption>
    </figure>
  );
}
