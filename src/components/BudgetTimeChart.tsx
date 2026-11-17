import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@un-eosg/ui/components/data-table";
import { typography } from "@un-eosg/ui/typography";
import { formatBudgetHeading } from "@/lib/budget-text";
import type { Status, TimePoint, TimeSeries } from "@/lib/budget-time-series";

const colors = [
  "var(--color-un-blue-text)",
  "var(--color-au-chico)",
  "var(--color-un-green-shade)",
  "var(--color-un-purple-text)",
  "var(--color-faded-jade)",
];

const statusLabel: Record<Status, string> = {
  actual: "Actual",
  planned: "Planned",
  unlabelled: "Unlabelled",
};

function metricName(name: string) {
  return name
    .replace(/\s*\((?:actuals?|planned|targets?)\)\s*$/i, "")
    .replace(/^(?:actuals?|planned|targets?)\b\s*/i, "")
    .trim();
}

function scaleTicks(min: number, max: number) {
  const spread = max - min || Math.abs(max) || 1;
  const rawStep = spread / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rawStep) ?? 10) *
    magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const bottom = lo === hi ? lo - step : lo;
  const top = lo === hi ? hi + step : hi;
  const ticks = Array.from(
    { length: Math.round((top - bottom) / step) + 1 },
    (_, index) => Number((bottom + index * step).toPrecision(12)),
  );
  return { bottom, top, ticks };
}

const axisNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 3,
});
const detailNumber = new Intl.NumberFormat("en", {
  maximumFractionDigits: 20,
});

export function BudgetTimeChart({
  label,
  series,
  percent = false,
}: {
  label: string;
  series: TimeSeries[];
  percent?: boolean;
}) {
  const points = series.flatMap((item) => item.points);
  const years = [
    ...new Map(points.map(({ year, period }) => [year, period])),
  ].sort(([a], [b]) => a - b);
  const first = years[0][0];
  const last = years.at(-1)![0];
  const values = points.map((point) => point.value);
  const { bottom, top, ticks } = scaleTicks(
    Math.min(...values),
    Math.max(...values),
  );
  const metrics = [...new Set(series.map((item) => metricName(item.name)))];
  const statuses = [...new Set(points.map(({ status }) => status))];
  const suffix = percent ? "%" : "";
  const left = 54;
  const right = 438;
  const baseline = 166;
  const x = (year: number) =>
    first === last
      ? (left + right) / 2
      : left + ((year - first) / (last - first)) * (right - left);
  const y = (value: number) =>
    baseline - ((value - bottom) / (top - bottom)) * 150;
  const color = (name: string) =>
    colors[metrics.indexOf(metricName(name)) % colors.length];
  const gap = (point: TimePoint, previous: TimePoint) =>
    point.year - previous.year > 1;

  return (
    <ChartFrame
      className="max-w-2xl"
      footer={
        <div className="space-y-3">
          {metrics.filter(Boolean).length > 0 && (
            <ul
              className={`${typography.caption} flex flex-wrap gap-x-4 gap-y-2`}
            >
              {metrics.map((name) => (
                <li key={name} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-0.5 w-4"
                    style={{ backgroundColor: color(name) }}
                  />
                  {formatBudgetHeading(name) || "Other series"}
                </li>
              ))}
            </ul>
          )}
          {statuses.some((status) => status !== "unlabelled") && (
            <ul
              className={`${typography.caption} flex flex-wrap gap-x-4 gap-y-2`}
            >
              {statuses.map((status) => (
                <li key={status} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`size-2.5 border border-foreground ${status === "unlabelled" ? "rotate-45" : "rounded-full"} ${status === "actual" ? "bg-foreground" : "bg-background"}`}
                  />
                  {statusLabel[status]}
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary
              className={`${typography.caption} w-fit cursor-pointer text-un-blue-text hover:underline`}
            >
              View values
            </summary>
            <Table aria-label={`${label} values`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead numeric>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.flatMap((item, seriesIndex) =>
                  item.points.map((point) => (
                    <TableRow key={`${seriesIndex}-${point.year}`}>
                      <TableCell>{point.period}</TableCell>
                      <TableCell>
                        {formatBudgetHeading(metricName(item.name)) || "—"}
                      </TableCell>
                      <TableCell>{statusLabel[point.status]}</TableCell>
                      <TableCell numeric>
                        {detailNumber.format(point.value)}
                        {suffix}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </details>
        </div>
      }
    >
      <svg
        viewBox="0 0 460 197"
        className="w-full"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <path
              d={`M ${left} ${y(tick)} H ${right}`}
              stroke="var(--border)"
            />
            <text
              x={left - 7}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {axisNumber.format(tick)}
              {suffix}
            </text>
          </g>
        ))}
        {years.map(([year, period], index) =>
          years.length <= 7 ||
          index === 0 ||
          index === years.length - 1 ||
          index % Math.ceil(years.length / 6) === 0 ? (
            <text
              key={year}
              x={x(year)}
              y={baseline + 18}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {period}
            </text>
          ) : null,
        )}
        {series.map((item, seriesIndex) => (
          <g key={seriesIndex}>
            {item.points.slice(1).map((point, index) => {
              const previous = item.points[index];
              if (gap(point, previous)) return null;
              return (
                <line
                  key={point.year}
                  x1={x(previous.year)}
                  y1={y(previous.value)}
                  x2={x(point.year)}
                  y2={y(point.value)}
                  stroke={color(item.name)}
                  strokeWidth="2.25"
                  strokeDasharray={
                    point.status === "planned" || previous.status === "planned"
                      ? "5 4"
                      : undefined
                  }
                />
              );
            })}
            {item.points.map((point) => (
              <g key={point.year}>
                {point.status === "unlabelled" ? (
                  <rect
                    x={x(point.year) - 2.8}
                    y={y(point.value) - 2.8}
                    width="5.6"
                    height="5.6"
                    transform={`rotate(45 ${x(point.year)} ${y(point.value)})`}
                    fill="var(--background)"
                    stroke={color(item.name)}
                    strokeWidth="1.8"
                  />
                ) : (
                  <circle
                    cx={x(point.year)}
                    cy={y(point.value)}
                    r="3.7"
                    stroke={color(item.name)}
                    strokeWidth="1.8"
                    fill={
                      point.status === "actual"
                        ? color(item.name)
                        : "var(--background)"
                    }
                  />
                )}
                <circle
                  cx={x(point.year)}
                  cy={y(point.value)}
                  r="7"
                  fill="transparent"
                >
                  <title>
                    {[
                      formatBudgetHeading(metricName(item.name)),
                      point.period,
                      statusLabel[point.status],
                      detailNumber.format(point.value) + suffix,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </title>
                </circle>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}
