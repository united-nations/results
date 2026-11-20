import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { typography } from "@un-eosg/ui/typography";
import { formatBudget as money } from "@un-eosg/ui/format-budget";
import { withBasePath } from "@/lib/paths";
import type { UninfoAnnualExpenditure } from "@/lib/uninfo";

const percent = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);

export function UninfoScopeComparison({
  data,
}: {
  data: UninfoAnnualExpenditure;
}) {
  const rows = [
    {
      label: `UN system (${data.year})`,
      amount: data.cebExpenditure,
      color: "bg-muted-foreground",
    },
    {
      label: `UN country teams (${data.countryTeamBenchmark.year})`,
      amount: data.countryTeamBenchmark.amount,
      color: "bg-un-blue-shade",
    },
    {
      label: `UN INFO (${data.year})`,
      amount: data.uninfoExpenditure,
      color: "bg-un-blue",
    },
  ];
  return (
    <figure
      aria-labelledby="uninfo-scope-title"
      className="mt-4 max-w-lg border-s-2 ps-3"
    >
      <ChartFrame
        header={
          <figcaption>
            <span id="uninfo-scope-title" className={typography.caption}>
              Annual expenditure · USD
            </span>
          </figcaption>
        }
      >
        <dl className="space-y-2">
          {rows.map((row) => {
            const share = row.amount / data.cebExpenditure;
            return (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,9rem)_minmax(2rem,1fr)_3.75rem] items-center gap-3"
              >
                <dt className={typography.caption}>{row.label}</dt>
                <dd className="contents">
                  <span
                    aria-hidden="true"
                    className="h-1.5 rounded-sm bg-muted"
                  >
                    <span
                      className={`block h-full rounded-sm ${row.color}`}
                      style={{ width: `${share * 100}%` }}
                    />
                  </span>
                  <span
                    className={`${typography.caption} text-end tabular-nums`}
                  >
                    {money(row.amount)}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        <details className={`${typography.caption} mt-3`}>
          <summary className="w-fit cursor-pointer underline underline-offset-2">
            Scope and sources
          </summary>
          <div className="mt-3 space-y-2 leading-relaxed">
            <p>
              UN INFO’s reported amount is equivalent to {percent(data.ratio)}{" "}
              of UN system expenditure in {data.year}. These are scale
              comparisons, not audited coverage rates or an accounting
              breakdown. All three bars use the same zero-based scale.
            </p>
            <p>
              The middle bar uses the published {data.countryTeamBenchmark.year}
              UN80 benchmark of {money(data.countryTeamBenchmark.amount)} spent
              through UN country teams. The UN system and UN INFO bars use{" "}
              {data.year}. The different years are intentional; no ratio to the
              country-team benchmark is presented. Its published precision is
              one decimal place in billions. The briefing attributes the figure
              to {data.countryTeamBenchmark.upstreamAttribution}, but does not
              specify the complete calculation or filters. Current CEB
              country-attributed totals do not reproduce it, so a source-vintage
              or population difference remains unresolved. This uncertainty
              concerns the calculation, not the briefing’s label.
            </p>
            <p>
              UN INFO reports country Cooperation Framework work rather than a
              complete financial ledger for the UN development system. An
              official evaluation found incomplete or outdated joint workplans,
              missing entity contributions and duplicate-entry burdens. Regional
              commissions also faced difficulty reporting budgets by country.
              Country teams also work on emergencies and recovery; their
              expenditure is broader than the subset reported through
              Cooperation Frameworks. Country coverage therefore does not imply
              full expenditure coverage. The difference between the bars cannot
              be assigned entirely to unreported spending or interpreted as a
              same-year funding gap.
            </p>
            <p>
              Sources:{" "}
              <a href={data.cebSource} className="text-un-blue-text underline">
                CEB system expenditure snapshot
              </a>
              ,{" "}
              <a
                href={data.countryTeamBenchmark.source}
                className="text-un-blue-text underline"
              >
                UN80 country-team expenditure benchmark (
                {data.countryTeamBenchmark.year})
              </a>
              ,{" "}
              <a
                href={data.uninfoCoverageSource}
                className="text-un-blue-text underline"
              >
                UN INFO coverage evaluation
              </a>
              . Annual UN INFO observations:{" "}
              <a
                href={withBasePath(
                  `/data/uninfo/annual-expenditure-${data.year}.json`,
                )}
                className="text-un-blue-text underline"
              >
                amounts and source query
              </a>
              .
            </p>
          </div>
        </details>
      </ChartFrame>
    </figure>
  );
}
