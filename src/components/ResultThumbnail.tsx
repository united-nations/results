import type { ResultThumbnailData } from "@/lib/result-thumbnail";

export function ResultThumbnail({ data }: { data: ResultThumbnailData }) {
  if (data.kind === "timeline") {
    const step = 104 / Math.max(1, data.stages.length - 1);
    return (
      <svg
        viewBox="0 0 120 32"
        preserveAspectRatio="xMidYMid"
        aria-hidden="true"
        className="mt-4 h-28 w-full text-muted-foreground"
      >
        <line
          x1={data.stages.length > 1 ? 8 : 60}
          y1="16"
          x2={data.stages.length > 1 ? 112 : 60}
          y2="16"
          stroke="var(--tile-color)"
        />
        {data.stages.map((stage, index) => (
          <g
            key={index}
            transform={`translate(${data.stages.length > 1 ? 8 + index * step : 60} 16)`}
          >
            <circle
              r="4"
              stroke="var(--tile-color)"
              strokeWidth="1.5"
              fill={stage.planned ? "var(--background)" : "var(--tile-color)"}
            />
          </g>
        ))}
      </svg>
    );
  }
  const points = data.series
    .flatMap((series) => series.points)
    .filter((point) => Number.isFinite(point.value));
  if (!points.length) return null;
  const first = Math.min(...points.map((point) => point.year));
  const last = Math.max(...points.map((point) => point.year));
  const min = Math.min(0, ...points.map((point) => point.value));
  const max = Math.max(0, ...points.map((point) => point.value));
  const x = (year: number) => 10 + ((year - first) / (last - first || 1)) * 280;
  const y = (value: number) => 90 - ((value - min) / (max - min || 1)) * 76;
  return (
    <svg
      viewBox="0 0 300 104"
      preserveAspectRatio="xMidYMax"
      aria-hidden="true"
      className="mt-4 h-28 w-full"
    >
      {[16, 54, 92].map((y) => (
        <line
          key={y}
          x1="10"
          x2="290"
          y1={y}
          y2={y}
          stroke="var(--border)"
          strokeWidth="0.75"
        />
      ))}
      {data.series.map((series, index) => {
        const entries = series.points.filter((point) =>
          Number.isFinite(point.value),
        );
        return (
          <g
            key={index}
            stroke="var(--tile-color)"
            opacity={Math.max(0.4, 1 - index * 0.12)}
          >
            <path
              d={entries
                .map(
                  (point, i) =>
                    `${i === 0 || point.year - entries[i - 1].year > 1 ? "M" : "L"} ${x(point.year)} ${y(point.value)}`,
                )
                .join(" ")}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={
                entries.every((point) => point.status === "planned")
                  ? "4 3"
                  : undefined
              }
            />
            {entries.map((point, i) => (
              <circle
                key={i}
                cx={x(point.year)}
                cy={y(point.value)}
                r="2.5"
                fill={
                  point.status === "planned"
                    ? "var(--background)"
                    : "var(--tile-color)"
                }
                strokeWidth="1.5"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
