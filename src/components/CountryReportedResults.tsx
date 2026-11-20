"use client";

/* eslint-disable @next/next/no-img-element -- Official SDG artwork from the local snapshot. */
import { useState } from "react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { FilterPopover } from "@un-eosg/ui/components/filter-popover";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { Button } from "@un-eosg/ui/components/button";
import {
  FinancialPanelBar,
  FinancialPanelPeriodSelector,
} from "@un-eosg/ui/components/financial-panel-parts";
import { typography } from "@un-eosg/ui/typography";
import { usePublicJson } from "@/hooks/usePublicJson";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import { withBasePath } from "@/lib/paths";
import {
  availableReportingPeriods,
  hasResult,
  resolveReportingPeriod,
  isOverallCell,
  observation,
  periodLabel,
  resultKind,
  resultNumber,
  resultNumberFormat,
  resultText,
  type CountryResultsData,
  type CountryResultsManifest,
  type ResultFramework,
  type ReportedIndicator,
  type ResultCell,
  type ResultSdgLink,
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

function SdgMetadata({ links }: { links: ResultSdgLink[] }) {
  const goals = [...new Set(links.map((link) => link.goal))].map(
    (goal) =>
      links.find((link) => link.goal === goal && link.source !== "catalogue") ??
      links.find((link) => link.goal === goal)!,
  );
  const precise = links.filter((link) => link.indicator || link.target);
  const explanation = (link: ResultSdgLink) => (
    <div className="space-y-2">
      <p>{link.indicatorName || link.targetName || link.goalName}</p>
      <p>
        {link.source === "catalogue"
          ? "Catalogue links describe related SDG measures, rather than asserting that this result measures each one."
          : link.source === "framework"
            ? "Linked through the parent framework item."
            : "Linked directly in the country framework."}
      </p>
    </div>
  );
  const detailLinks = (
    <ul className="mt-2 space-y-2">
      {precise.map((link) => (
        <li key={`${link.goal}-${link.target}-${link.indicator}`}>
          <Tooltip content={explanation(link)} width={300}>
            <ExternalLink
              href={`https://unstats.un.org/sdgs/metadata/?Goal=${link.goal}&Target=${encodeURIComponent(link.target ?? "")}&Text=${encodeURIComponent(link.indicator ?? "")}`}
              className={`text-un-blue-text underline underline-offset-2 ${link.source === "catalogue" ? "decoration-dashed" : ""}`}
            >
              {link.indicator
                ? `SDG indicator ${link.indicator}`
                : `SDG target ${link.target}`}
            </ExternalLink>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`${typography.caption} mt-2`}>
      {goals.length ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {goals.map((link) => (
            <Tooltip key={link.goal} content={explanation(link)} width={300}>
              <ExternalLink
                href={`https://sdgs.un.org/goals/goal${link.goal}`}
                className={`text-un-blue-text underline underline-offset-2 ${link.source === "catalogue" ? "decoration-dashed" : ""}`}
              >
                SDG {link.goal}
              </ExternalLink>
            </Tooltip>
          ))}
        </p>
      ) : (
        <p className="text-muted-foreground">No SDG link provided</p>
      )}
      {precise.length > 1 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-un-blue-text">
            Related SDG targets and indicators ({precise.length})
          </summary>
          {detailLinks}
        </details>
      ) : precise.length ? (
        detailLinks
      ) : null}
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
  const reportingEntities = [
    ...new Map(
      indicator.cells
        .filter((cell) => cell.agency)
        .map((cell) => [cell.agency!.id, cell.agency!]),
    ).values(),
  ].sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
  const mainRows = agencies.length ? agencies : breakdowns;
  const otherRows = agencies.length
    ? breakdowns.filter((cell) => !agencies.includes(cell))
    : [];
  const goals = [
    ...new Map(
      (indicator.sdgs ?? []).map((link) => [link.goal, link]),
    ).values(),
  ];
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
        {goals.length > 0 && (
          <div className="flex max-w-24 shrink-0 flex-wrap justify-end gap-1">
            {goals.map((link) => (
              <ExternalLink
                key={link.goal}
                href={`https://sdgs.un.org/goals/goal${link.goal}`}
                title={`SDG ${link.goal}${link.goalName ? `: ${link.goalName}` : ""}`}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
              >
                <img
                  src={withBasePath(
                    `/images/sdgs/${String(link.goal).padStart(2, "0")}.jpg`,
                  )}
                  alt={`SDG ${link.goal}${link.goalName ? `: ${link.goalName}` : ""}`}
                  width={28}
                  height={28}
                  loading="lazy"
                  className="size-7"
                />
              </ExternalLink>
            ))}
          </div>
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
            indicator.code ? `Indicator ${indicator.code}` : "",
            indicator.commonIndicator ? "Common indicator" : "",
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
        {reportingEntities.length > 0 && (
          <p className={`${typography.caption} mt-2`}>
            <span className="text-muted-foreground">Reporting entities: </span>
            {reportingEntities.map((entity, index) => (
              <span key={entity.id}>
                {index > 0 ? ", " : ""}
                <abbr title={entity.name} className="no-underline">
                  {entity.code || entity.name}
                </abbr>
              </span>
            ))}
          </p>
        )}
        <SdgMetadata links={indicator.sdgs ?? []} />
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

function FrameworkReportedResults({
  framework,
}: {
  framework: ResultFramework;
}) {
  const { data, failed, retry } = usePublicJson<CountryResultsData>(
    `/data/uninfo/results/${framework.planId}.json`,
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [units, setUnits] = useState<string[]>([]);
  if (!data)
    return (
      <div>
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
      </div>
    );
  const periods = availableReportingPeriods(data);
  const periodId = resolveReportingPeriod(data, selectedPeriod) ?? -1;
  const terms = searchTerms(query);
  const cards = data.indicators.map((indicator) => ({
    indicator,
    summary: indicatorSummary(indicator, periodId),
  }));
  const unitOptions = [
    ...new Set(
      data.indicators
        .filter((indicator) => indicator.commonIndicator && indicator.unit)
        .map((indicator) => indicator.unit!),
    ),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((unit) => ({
      value: unit,
      label: unit,
      count: data.indicators.filter(
        (indicator) => indicator.commonIndicator && indicator.unit === unit,
      ).length,
    }));
  const filtered = cards.filter(({ indicator, summary }) => {
    const text = normalizeSearchText(
      `${indicator.title} ${indicator.description} ${indicator.parentTitle} ${indicator.unit ?? ""} ${(indicator.sdgs ?? []).map((link) => `SDG ${link.goal} ${link.goalName} ${link.target ?? ""} ${link.indicator ?? ""}`).join(" ")} ${indicator.cells.map((cell) => `${cell.agency?.code ?? ""} ${cell.agency?.name ?? ""}`).join(" ")} ${resultText(summary.actual?.value)} ${summary.breakdowns.map(cellLabel).join(" ")}`,
    );
    return (
      terms.every((term) => text.includes(term)) &&
      (!units.length ||
        (indicator.commonIndicator === true &&
          units.includes(indicator.unit ?? ""))) &&
      (type === "all" ||
        (type === "numeric" &&
          ["numeric", "percentage"].includes(summary.kind)) ||
        type === summary.kind ||
        (summary.kind === "breakdowns" &&
          summary.breakdowns.some((cell) => {
            const kind = resultKind(
              observation(cell, periodId)?.value,
              indicator.unit,
            );
            return type === "numeric"
              ? ["numeric", "percentage"].includes(kind)
              : type === kind;
          })))
    );
  });
  const reportedCount = cards.filter(
    ({ summary }) => summary.kind !== "missing",
  ).length;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`${typography.body} mt-2 max-w-3xl`}>
            What changed, who was reached, and what was delivered. Explore the
            published indicators, with the original units, targets and reporting
            periods.
          </p>
        </div>
        {periods.length > 0 && (
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
        )}
      </div>
      {framework.countries.length > 1 && (
        <p className={`${typography.caption} mt-3`}>
          Shared framework covering {framework.countries.join(", ")}. Results
          are reported for the shared framework, without separate country
          allocations.
        </p>
      )}
      {!data.indicators.some((indicator) =>
        indicator.cells.some((cell) =>
          cell.observations.some(
            (item) => item.metricId === 3 && hasResult(item.value),
          ),
        ),
      ) && (
        <p className={`${typography.caption} mt-3`}>
          No achievements have been reported in this published snapshot.
          Indicator definitions, baselines and any targets remain available.
        </p>
      )}
      <p className={`${typography.caption} mt-4`}>
        {data.indicators.length} indicators · {reportedCount} with reported
        achievements or breakdowns{" "}
        {periods.length ? "for this period" : "in this snapshot"}. Counts and
        categories are shown as reported; overlapping agency or population
        breakdowns are kept separate.
      </p>
      <div className="my-5 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            variant="border-bottom"
            aria-label={`Search ${framework.label} results`}
            placeholder="Search results, agencies or topics…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            showClear
            onClear={() => setQuery("")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterPopover
            label="Common indicator unit"
            options={unitOptions}
            selected={units}
            onChange={setUnits}
            className={`border-border bg-secondary text-foreground hover:bg-secondary/80 any-pointer-coarse:min-h-11 ${units.length ? "bg-muted" : ""}`}
          />
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
      </div>
      <p role="status" className={`${typography.caption} mb-4`}>
        {filtered.length} results shown
        {units.length ? " · Common indicators only" : ""}
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
          UN INFO · {framework.label}
        </ExternalLink>
        . The cards include both UN-supported delivery and broader country
        outcomes; each indicator’s definition provides its scope.
      </p>
    </div>
  );
}

export function CountryReportedResults() {
  const {
    data: manifest,
    failed,
    retry,
  } = usePublicJson<CountryResultsManifest>(
    "/data/uninfo/results/manifest.json",
  );
  const [selectedPlan, setSelectedPlan] = useState<number>();
  const framework =
    manifest?.frameworks.find(
      (item) => item.planId === (selectedPlan ?? manifest.defaultPlanId),
    ) ?? manifest?.frameworks[0];
  return (
    <section
      aria-labelledby="country-reported-results"
      className="mt-12 border-t pt-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="country-reported-results" className={typography.sectionTitle}>
          Reported results{framework ? ` · ${framework.label}` : ""}
        </h2>
        {manifest && framework && (
          <FinancialPanelPeriodSelector
            label="Select results country or framework"
            variant="pill"
            options={manifest.frameworks.map((item) => ({
              value: String(item.planId),
              label: item.label,
            }))}
            selected={String(framework.planId)}
            onChange={(value) => setSelectedPlan(Number(value))}
          />
        )}
      </div>
      {framework ? (
        <FrameworkReportedResults
          key={framework.planId}
          framework={framework}
        />
      ) : (
        <div>
          <p role={failed ? "alert" : "status"} className={typography.meta}>
            {failed
              ? "The results framework list could not be loaded."
              : "Loading results frameworks…"}
          </p>
          {failed && (
            <Button className="mt-3" onClick={retry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
