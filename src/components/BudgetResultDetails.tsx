import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { BudgetMeasures, BudgetProse } from "@/components/BudgetNarrative";
import { BudgetTimeChart } from "@/components/BudgetTimeChart";
import { formatBudgetHeading } from "@/lib/budget-text";
import { figureTimeSeries } from "@/lib/budget-time-series";
import type { BudgetResult } from "@/lib/programme-budget";

export function BudgetResultDetails({
  result,
  source,
  edition,
}: {
  result: BudgetResult;
  source: string;
  edition: number;
}) {
  return (
    <>
      {result.narrative && <BudgetProse paragraphs={[result.narrative]} />}
      {result.measures.length > 0 && (
        <BudgetMeasures measures={result.measures} />
      )}
      {result.figures.map((figure, figureIndex) => {
        const series = figureTimeSeries(figure, edition - 2);
        const byUnit = Map.groupBy(series ?? [], (item) => !!item.percent);
        const title = formatBudgetHeading(
          [figure.title, figure.subtitle].filter(Boolean).join(" · "),
        );
        return (
          <section key={figureIndex} className="space-y-2 border-t pt-4">
            <h3 className={typography.subTitle}>
              {title || "Performance measure"}
            </h3>
            {[...byUnit].map(([percent, items]) => (
              <BudgetTimeChart
                key={String(percent)}
                label={title || "Performance over time"}
                series={items}
                percent={percent}
              />
            ))}
            <ExternalLink
              className={`${typography.caption} inline-block text-un-blue-text underline underline-offset-4`}
              href={figure.source ?? source}
            >
              {figure.label
                ? `View ${figure.label.toLowerCase()} in the budget document`
                : "View figure in the budget document"}
            </ExternalLink>
          </section>
        );
      })}
    </>
  );
}
