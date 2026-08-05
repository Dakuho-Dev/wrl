import { formatMoney } from "@/lib/utils";

export type Point = { label: string; value: number };

/** Lightweight inline SVG area chart — no client JS, no chart library. */
export function AreaChart({
  data,
  height = 200,
  currency,
}: {
  data: Point[];
  height?: number;
  currency?: string;
}) {
  if (!data.length) return null;

  const width = 720;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => ({
    x: padding.left + i * step,
    y: padding.top + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${padding.top + innerH} L${points[0].x.toFixed(1)},${padding.top + innerH} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a90ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2a90ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * ratio}
            y2={padding.top + innerH * ratio}
            stroke="#2a3855"
            strokeOpacity="0.4"
            strokeDasharray="3 4"
          />
        ))}

        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="#54b0ff" strokeWidth="2.2" strokeLinejoin="round" />

        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill="#0a0e18" stroke="#54b0ff" strokeWidth="2">
            <title>{`${p.label}: ${currency ? formatMoney(p.value, currency) : p.value}`}</title>
          </circle>
        ))}

        {points.map((p, i) =>
          i % Math.ceil(points.length / 7) === 0 ? (
            <text
              key={`label-${p.label}`}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** Horizontal bar breakdown, e.g. revenue by channel. */
export function BarList({
  data,
  currency,
  suffix,
}: {
  data: Point[];
  currency?: string;
  suffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{item.label}</span>
            <span className="font-medium text-white">
              {currency ? formatMoney(item.value, currency) : item.value}
              {suffix ?? ""}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Donut for status distribution. */
export function Donut({ data }: { data: Array<Point & { color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        {data.map((slice) => {
          const length = (slice.value / total) * circumference;
          const element = (
            <circle
              key={slice.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="18"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return element;
        })}
        <circle cx="80" cy="80" r="42" fill="#0a0e18" />
      </svg>

      <div className="space-y-2">
        {data.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
            <span className="text-slate-400">{slice.label}</span>
            <span className="font-medium text-white">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
