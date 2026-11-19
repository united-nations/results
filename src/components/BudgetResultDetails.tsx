import { typography } from "@un-eosg/ui/typography";
import { BudgetMeasures, BudgetProse } from "@/components/BudgetNarrative";
import { BudgetTimeChart } from "@/components/BudgetTimeChart";
import { formatBudgetHeading } from "@/lib/budget-text";
import { figureTimeSeries } from "@/lib/budget-time-series";
import type { BudgetResult } from "@/lib/programme-budget";

export function BudgetResultDetails({
  result,
  edition,
}: {
  result: BudgetResult;
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
          </section>
        );
      })}
    </>
  );
}
