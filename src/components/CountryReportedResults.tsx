"use client";

import { useState } from "react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { Button } from "@un-eosg/ui/components/button";
import {
  FinancialPanelBar,
  FinancialPanelPeriodSelector,
} from "@un-eosg/ui/components/financial-panel-parts";
import { typography } from "@un-eosg/ui/typography";
import { usePublicJson } from "@/hooks/usePublicJson";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import {
  hasResult,
  isOverallCell,
  observation,
  periodLabel,
  resultKind,
  resultNumber,
  resultNumberFormat,
  resultText,
  type CountryResultsData,
  type ReportedIndicator,
  type ResultCell,
} from "@/lib/uninfo-results";

const kindLabels = {
  numeric: "Numerical",
  percentage: "Percentage",
  categorical: "Categorical",
  narrative: "Narrative",
  missing: "Not reported",
  breakdowns: "By entity / group",
};

function cellLabel(cell: ResultCell) {
  return (
    [cell.agency?.code, cell.category, cell.location]
      .filter(Boolean)
      .join(" · ") || "Reported breakdown"
  );
}

function displayNumber(value: unknown, unit: string | null) {
  const number = resultNumber(value);
  if (number === null) return resultText(value);
  return `${resultNumberFormat.format(number)}${/%|percent/i.test(`${unit ?? ""} ${resultText(value)}`) ? "%" : ""}`;
}

function indicatorSummary(indicator: ReportedIndicator, periodId: number) {
  const overall = indicator.cells.find(isOverallCell);
  const actual = observation(overall, periodId);
  const target = observation(overall, periodId, 2);
  const breakdowns = indicator.cells.filter(
    (cell) =>
      cell !== overall &&
      (observation(cell, periodId) || observation(cell, periodId, 2)),
  );
  const agencies = breakdowns.filter(
    (cell) =>
      cell.agency &&
      !cell.category &&
      !cell.location &&
      !cell.implementingPartnerId &&
      !cell.contributingPartnerId,
  );
  const kind: keyof typeof kindLabels = actual
    ? resultKind(actual.value, indicator.unit)
    : breakdowns.some((cell) => observation(cell, periodId))
      ? "breakdowns"
      : "missing";
  return { overall, actual, target, breakdowns, agencies, kind };
}

function ComparisonPair({
  actual,
  target,
  unit,
  maximum,
  compact = false,
}: {
  actual: unknown;
  target: unknown;
  unit: string | null;
  maximum?: number;
  compact?: boolean;
}) {
  const values = [resultNumber(actual), resultNumber(target)];
  const scale = maximum ?? Math.max(0, ...values.map((value) => value ?? 0));
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {[
        { label: "Reported", value: actual, color: "var(--color-un-blue)" },
        {
          label: "Target",
          value: target,
          color: "var(--color-neutral-control)",
        },
      ].map(({ label, value, color }) => {
        const numeric = resultNumber(value);
        const kind = resultKind(value, unit);
        const bar =
          hasResult(value) &&
          numeric !== null &&
          numeric >= 0 &&
          (kind === "numeric" || kind === "percentage");
        const text = hasResult(value)
          ? displayNumber(value, unit)
          : "Not reported";
        return (
          <div
            key={label}
            className={
              compact
                ? "min-w-0"
                : "grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2"
            }
          >
            {!compact && <span className={typography.caption}>{label}</span>}
            {bar ? (
              <span
                role="img"
                aria-label={`${label}: ${text}`}
                title={`${label}: ${text}`}
                className={`block overflow-hidden rounded-sm bg-muted ${compact ? "[&>div>div]:h-1.5" : ""}`}
              >
                <FinancialPanelBar
                  percent={((numeric ?? 0) / Math.max(scale, 1)) * 100}
                  color={color}
                />
              </span>
            ) : (
              <span
                className={`${typography.caption} block truncate ${compact ? "leading-tight" : ""}`}
                title={`${label}: ${text}`}
              >
                {compact && <span className="sr-only">{label}: </span>}
                {hasResult(value) ? text : "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BreakdownRows({
  cells,
  periodId,
  unit,
}: {
  cells: ResultCell[];
  periodId: number;
  unit: string | null;
}) {
  const ordered = [...cells].sort(
    (a, b) =>
      (resultNumber(observation(b, periodId)?.value) ?? -Infinity) -
        (resultNumber(observation(a, periodId)?.value) ?? -Infinity) ||
      cellLabel(a).localeCompare(cellLabel(b)),
  );
  const maximum = Math.max(
    0,
    ...cells.flatMap((cell) => [
      resultNumber(observation(cell, periodId)?.value) ?? 0,
      resultNumber(observation(cell, periodId, 2)?.value) ?? 0,
    ]),
  );
  return (
    <div>
      <div
        className={`${typography.caption} mb-2 flex flex-wrap justify-end gap-3`}
      >
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-4 rounded-sm bg-un-blue"
          />
          Reported
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-4 rounded-sm bg-neutral-control"
          />
          Target
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {ordered.map((cell) => (
          <li
            key={cell.id}
            className="grid grid-cols-[minmax(4rem,1fr)_minmax(0,2fr)] items-center gap-3 py-1.5"
          >
            <span
              className={`${typography.caption} min-w-0 truncate`}
              title={
                cell.agency?.name && !cell.category && !cell.location
                  ? cell.agency.name
                  : cellLabel(cell)
              }
            >
              {cellLabel(cell)}
            </span>
            <ComparisonPair
              actual={observation(cell, periodId)?.value}
              target={observation(cell, periodId, 2)?.value}
              unit={unit}
              maximum={maximum}
              compact
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function IndicatorCard({
  indicator,
  data,
  periodId,
}: {
  indicator: ReportedIndicator;
  data: CountryResultsData;
  periodId: number;
}) {
  const { overall, actual, target, breakdowns, agencies, kind } =
    indicatorSummary(indicator, periodId);
  const baseline =
    overall?.observations.filter(
      (item) => item.metricId === 1 && hasResult(item.value),
    ) ?? [];
  const fullText = actual ? resultText(actual.value) : "";
  const numerical = kind === "numeric" || kind === "percentage";
  const mainRows = agencies.length ? agencies : breakdowns;
  const otherRows = agencies.length
    ? breakdowns.filter((cell) => !agencies.includes(cell))
    : [];
  const period = data.periods.find((item) => item.id === periodId);
  const unit =
    indicator.unit &&
    !/^(number|numbers|%|percent|binary|scale|range)$/i.test(indicator.unit)
      ? indicator.unit
      : null;
  return (
    <article
      aria-label={indicator.title}
      className="flex min-h-64 min-w-0 flex-col rounded-[5px] border border-un-blue/40 bg-background p-4"
    >
      <div>
        {actual ? (
          <>
            <p
              className={`${kind === "narrative" ? typography.lead : typography.chartTotal} break-words whitespace-pre-line tabular-nums`}
              title={fullText}
            >
              {numerical
                ? displayNumber(actual.value, indicator.unit)
                : fullText.length > 240
                  ? `${fullText.slice(0, 240)}…`
                  : fullText}
            </p>
            {numerical && unit && (
              <p className={`${typography.meta} mt-1`}>{unit}</p>
            )}
            {kind === "narrative" && fullText.length > 240 && (
              <details className="mt-2">
                <summary
                  className={`${typography.caption} cursor-pointer text-un-blue-text`}
                >
                  Read full result
                </summary>
                <p
                  className={`${typography.body} mt-2 break-words whitespace-pre-line`}
                >
                  {fullText}
                </p>
              </details>
            )}
          </>
        ) : (
          <p className={`${typography.chartTotal} text-muted-foreground`}>
            {kind === "breakdowns" ? "By entity / group" : "Not reported"}
          </p>
        )}
      </div>
      <h3
        className={`${typography.body} mt-3 font-normal break-words text-foreground`}
      >
        {indicator.title}
      </h3>
      {(actual || target) && (
        <div className="mt-4">
          <ComparisonPair
            actual={actual?.value}
            target={target?.value}
            unit={indicator.unit}
          />
        </div>
      )}
      {!actual && mainRows.length > 0 && (
        <div className="mt-4">
          <BreakdownRows
            cells={mainRows.slice(0, 3)}
            periodId={periodId}
            unit={indicator.unit}
          />
        </div>
      )}
      <div className="mt-auto pt-4">
        <p className={`${typography.caption} border-t pt-3`}>
          {[
            period ? periodLabel(period) : "",
            indicator.code ? `Indicator ${indicator.code}` : "",
            kindLabels[kind],
          ]
            .filter(Boolean)
            .join(" · ")}
          {" · "}
          <ExternalLink
            href={
              overall
                ? `${data.apiBase}/planEntityCell/${overall.id}`
                : data.source
            }
            className="text-un-blue-text underline underline-offset-2"
          >
            UN INFO
          </ExternalLink>
        </p>
        <details className="mt-2">
          <summary
            className={`${typography.caption} cursor-pointer text-un-blue-text`}
          >
            Details
            {breakdowns.length ? ` and breakdowns (${breakdowns.length})` : ""}
          </summary>
          <div className="mt-3 space-y-3">
            {mainRows.length > 0 && (
              <BreakdownRows
                cells={mainRows}
                periodId={periodId}
                unit={indicator.unit}
              />
            )}
            {otherRows.length > 0 && (
              <details>
                <summary
                  className={`${typography.caption} cursor-pointer text-un-blue-text`}
                >
                  Population and other breakdowns ({otherRows.length})
                </summary>
                <div className="mt-2">
                  <BreakdownRows
                    cells={otherRows}
                    periodId={periodId}
                    unit={indicator.unit}
                  />
                </div>
              </details>
            )}
            <div className={`${typography.caption} space-y-2 border-t pt-3`}>
              {indicator.description && (
                <p className="break-words whitespace-pre-line">
                  {indicator.description}
                </p>
              )}
              {indicator.parentTitle && (
                <p className="whitespace-pre-line">{indicator.parentTitle}</p>
              )}
              <p>
                Unit: {indicator.unit || "Not specified"} · Calculation:{" "}
                {indicator.calculation || "Not specified"}
              </p>
              {baseline.map((item) => (
                <p key={item.periodId} className="break-words">
                  Baseline: {resultText(item.value)}{" "}
                  {data.periods.find((entry) => entry.id === item.periodId)
                    ? `(${periodLabel(data.periods.find((entry) => entry.id === item.periodId)!)})`
                    : ""}
                </p>
              ))}
            </div>
          </div>
        </details>
      </div>
    </article>
  );
}

export function CountryReportedResults() {
  const { data, failed, retry } = usePublicJson<CountryResultsData>(
    "/data/uninfo/results/1488.json",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  if (!data)
    return (
      <section className="mt-12 border-t pt-8">
        <h2 className={typography.sectionTitle}>Reported results · Kenya</h2>
        <p
          role={failed ? "alert" : "status"}
          className={`${typography.meta} mt-3`}
        >
          {failed
            ? "The reported results could not be loaded."
            : "Loading reported results…"}
        </p>
        {failed && (
          <Button className="mt-3" onClick={retry}>
            Try again
          </Button>
        )}
      </section>
    );
  const periods = data.periods
    .filter((period) =>
      data.indicators.some((indicator) =>
        indicator.cells.some((cell) =>
          cell.observations.some(
            (item) =>
              item.periodId === period.id &&
              [2, 3].includes(item.metricId) &&
              hasResult(item.value),
          ),
        ),
      ),
    )
    .sort(
      (a, b) => b.start.localeCompare(a.start) || b.end.localeCompare(a.end),
    );
  const periodId =
    selectedPeriod ??
    periods.find(
      (period) => period.start === "2024-07-01" && period.end === "2025-06-30",
    )?.id ??
    periods[0]?.id;
  if (periodId === undefined)
    return (
      <section className="mt-12 border-t pt-8">
        <h2 className={typography.sectionTitle}>Reported results · Kenya</h2>
        <p className={`${typography.meta} mt-3`}>
          No reporting periods are available.
        </p>
      </section>
    );
  const terms = searchTerms(query);
  const cards = data.indicators.map((indicator) => ({
    indicator,
    summary: indicatorSummary(indicator, periodId),
  }));
  const filtered = cards.filter(({ indicator, summary }) => {
    const text = normalizeSearchText(
      `${indicator.title} ${indicator.description} ${indicator.parentTitle} ${resultText(summary.actual?.value)} ${summary.breakdowns.map(cellLabel).join(" ")}`,
    );
    return (
      terms.every((term) => text.includes(term)) &&
      (type === "all" ||
        (type === "numeric" &&
          ["numeric", "percentage"].includes(summary.kind)) ||
        type === summary.kind)
    );
  });
  const reportedCount = cards.filter(
    ({ summary }) => summary.kind !== "missing",
  ).length;
  return (
    <section
      aria-labelledby="country-reported-results"
      className="mt-12 border-t pt-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="country-reported-results" className={typography.sectionTitle}>
            Reported results · Kenya
          </h2>
          <p className={`${typography.body} mt-2 max-w-3xl`}>
            What changed, who was reached, and what was delivered. Explore
            Kenya’s reported indicators, with the original units, targets and
            reporting periods.
          </p>
        </div>
        <FinancialPanelPeriodSelector
          label="Select results reporting period"
          variant="pill"
          options={periods.map((period) => ({
            value: String(period.id),
            label: periodLabel(period),
          }))}
          selected={String(periodId)}
          onChange={(value) => setSelectedPeriod(Number(value))}
        />
      </div>
      <p className={`${typography.caption} mt-4`}>
        {data.indicators.length} indicators · {reportedCount} with reported
        achievements or breakdowns for this period. Counts and categories are
        shown as reported; overlapping agency or population breakdowns are kept
        separate.
      </p>
      <div className="my-5 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            variant="border-bottom"
            aria-label="Search Kenya results"
            placeholder="Search results, agencies or topics…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            showClear
            onClear={() => setQuery("")}
          />
        </div>
        <SegmentedControl
          label="Filter results by type"
          value={type}
          onValueChange={setType}
          options={[
            { value: "all", label: "All results" },
            { value: "numeric", label: "Numbers" },
            { value: "categorical", label: "Categories" },
            { value: "narrative", label: "Narratives" },
            { value: "missing", label: "Not reported" },
          ]}
        />
      </div>
      <p role="status" className={`${typography.caption} mb-4`}>
        {filtered.length} results shown
      </p>
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ indicator }) => (
          <IndicatorCard
            key={indicator.id}
            indicator={indicator}
            data={data}
            periodId={periodId}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className={`${typography.body} py-8`}>
          No results match these filters.
        </p>
      )}
      <p className={`${typography.caption} mt-5`}>
        Source:{" "}
        <ExternalLink
          href={data.source}
          className="text-un-blue-text underline"
        >
          UN INFO · Kenya Cooperation Framework
        </ExternalLink>
        . The cards include both UN-supported delivery and broader country
        outcomes; each indicator’s definition provides its scope.
      </p>
    </section>
  );
}
