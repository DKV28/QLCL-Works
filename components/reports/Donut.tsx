// Biểu đồ tròn (donut) tự vẽ bằng SVG, không dùng thư viện.
export interface DonutSegment {
  label: string;
  value: number;
  color: string; // mã màu hoặc biến CSS
}

export function Donut({
  segments,
  size = 160,
  thickness = 26,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0;
    const len = frac * circ;
    const arc = {
      ...seg,
      dash: `${len} ${circ - len}`,
      dashoffset: -offset,
    };
    offset += len;
    return arc;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-800"
            strokeWidth={thickness}
          />
          {total > 0 &&
            arcs.map((a, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={thickness}
                strokeDasharray={a.dash}
                strokeDashoffset={a.dashoffset}
              />
            ))}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 text-xl font-bold dark:fill-gray-100"
        >
          {total}
        </text>
      </svg>

      <div className="space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
