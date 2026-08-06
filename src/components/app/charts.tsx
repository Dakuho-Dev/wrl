import { formatMoney } from "@/lib/utils";

export type Point = { label: string; value: number };

const ACCENT = "#1b5e3f";
const ACCENT_SOFT = "#bcd8c8";
const RULE = "#d9d4c4";

/**
 * Column chart. Hard-edged bars on ruled guides — deliberately not a smooth
 * gradient area chart. No client JS, no chart library.
 */
export function TrendChart({
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
  const pad = { top: 10, right: 4, bottom: 24, left: 4 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const slot = innerW / data.length;
  const barW = Math.max(slot * 0.56, 3);
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Trend">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + innerH * ratio}
          y2={pad.top + innerH * ratio}
          stroke={RULE}
          strokeWidth={ratio === 1 ? 1.5 : 1}
        />
      ))}

      {data.map((point, index) => {
        const h = Math.max((point.value / max) * innerH, point.value > 0 ? 2 : 0);
        const x = pad.left + index * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        return (
          <g key={point.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={index === peak ? ACCENT : ACCENT_SOFT}
              stroke={ACCENT}
              strokeWidth="1"
            >
              <title>{`${point.label}: ${currency ? formatMoney(point.value, currency) : point.value}`}</title>
            </rect>
          </g>
        );
      })}

      {data.map((point, index) =>
        index % Math.ceil(data.length / 7) === 0 ? (
          <text
            key={`label-${point.label}`}
            x={pad.left + index * slot + slot / 2}
            y={height - 7}
            textAnchor="middle"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
            fill="#928d7c"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Ranked rows with a measured rule — reads like a table, not a dashboard widget. */
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
    <div className="divide-y divide-line border-y border-line">
      {data.map((item, index) => (
        <div key={item.label} className="py-2.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-[10px] text-muted-2">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-ink-2">{item.label}</span>
            </span>
            <span className="shrink-0 font-mono text-[13px] text-ink">
              {currency ? formatMoney(item.value, currency) : item.value}
              {suffix ?? ""}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 bg-paper-2">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Single stacked rule showing distribution, with a keyed legend below. */
export function SplitBar({ data }: { data: Array<Point & { color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden border border-line-strong">
        {data.map((slice) => (
          <div
            key={slice.label}
            className="h-full border-r border-line-strong last:border-r-0"
            style={{ width: `${(slice.value / total) * 100}%`, background: slice.color }}
            title={`${slice.label}: ${slice.value}`}
          />
        ))}
      </div>

      <dl className="mt-4 divide-y divide-line border-y border-line">
        {data.map((slice) => (
          <div key={slice.label} className="flex items-center gap-3 py-2">
            <span
              className="h-3 w-3 shrink-0 border border-line-strong"
              style={{ background: slice.color }}
            />
            <dt className="flex-1 truncate text-sm capitalize text-ink-2">{slice.label}</dt>
            <dd className="font-mono text-[13px] text-ink">{slice.value}</dd>
            <dd className="w-12 text-right font-mono text-[11px] text-muted-2">
              {Math.round((slice.value / total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
