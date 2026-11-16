import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SecondaryHeader } from "@un-eosg/ui/components/secondary-header";
import { typography } from "@un-eosg/ui/typography";
import { BudgetMeasures, BudgetProse } from "@/components/BudgetNarrative";
import { BudgetTimeChart } from "@/components/BudgetTimeChart";
import { ResultSidecar } from "@/components/ResultSidecar";
import { SiteShell } from "@/components/SiteShell";
import { figureTimeSeries } from "@/lib/budget-time-series";
import { getEntityDescription } from "@/lib/entity-descriptions";
import {
  type BudgetContent,
  type BudgetEntity,
  type BudgetResult,
  type BudgetSubprogramme,
  budgetEdition,
  entityHref,
} from "@/lib/programme-budget";

function ResultsList({
  results,
  source,
}: {
  results: BudgetResult[];
  source: string;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {results.map((result, index) => (
        <li key={index}>
          <ResultSidecar
            title={result.title || "Performance measures"}
            label={result.label}
            source={source}
          >
            {result.narrative && (
              <BudgetProse paragraphs={[result.narrative]} />
            )}
            {result.measures.length > 0 && (
              <BudgetMeasures measures={result.measures} />
            )}
            {result.figures.map((figure, figureIndex) => {
              const series = figureTimeSeries(figure, budgetEdition - 2);
              const byUnit = Map.groupBy(
                series ?? [],
                (item) => !!item.percent,
              );
              const title = [figure.title, figure.subtitle]
                .filter(Boolean)
                .join(" · ");
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
                  <a
                    className={`${typography.caption} inline-block text-un-blue-text underline underline-offset-4`}
                    href={figure.source ?? source}
                  >
                    {figure.label
                      ? `View ${figure.label.toLowerCase()} in the budget document`
                      : "View figure in the budget document"}
                  </a>
                </section>
              );
            })}
          </ResultSidecar>
        </li>
      ))}
    </ul>
  );
}

function ContentSections({
  content,
  heading,
}: {
  content: BudgetContent;
  heading?: string;
}) {
  return (
    <section className="space-y-9">
      {heading && <h2 className={typography.sectionTitle}>{heading}</h2>}
      {content.objectives.length > 0 && (
        <div className="space-y-3 border-s-2 border-un-blue bg-muted/40 px-4 py-4 sm:px-5">
          <h3 className={typography.sectionTitle}>Objective</h3>
          <BudgetProse paragraphs={content.objectives} />
        </div>
      )}
      {content.strategy.length > 0 && (
        <div className="space-y-3">
          <h3 className={typography.sectionTitle}>Strategy</h3>
          <BudgetProse paragraphs={content.strategy} />
        </div>
      )}
      {content.performance.length > 0 && (
        <div className="space-y-3">
          <h3 className={typography.sectionTitle}>
            Programme performance in {budgetEdition - 2}
          </h3>
          <ResultsList results={content.performance} source={content.source} />
        </div>
      )}
      {content.planned.length > 0 && (
        <div className="space-y-3">
          <h3 className={typography.sectionTitle}>
            Planned results for {budgetEdition}
          </h3>
          <ResultsList results={content.planned} source={content.source} />
        </div>
      )}
      <a
        href={content.source}
        className={`${typography.meta} inline-block text-un-blue-text underline underline-offset-4`}
      >
        {content.symbol}
      </a>
    </section>
  );
}

export function BudgetEntityPage({
  entity,
  selected,
}: {
  entity: BudgetEntity;
  selected?: BudgetSubprogramme;
}) {
  const description = getEntityDescription(entity.id);
  const path = entityHref(entity.id);
  const tabs = entity.subprogrammes.map((subprogramme) => ({
    href: entityHref(entity.id, subprogramme.id),
    label: `SP ${subprogramme.number}`,
    title: subprogramme.name,
  }));
  const content = selected
    ? selected.sections.toSorted(
        (a, b) => Number(Boolean(a.name)) - Number(Boolean(b.name)),
      )
    : entity.overview;

  return (
    <SiteShell>
      <Link
        href="/"
        className={`${typography.meta} text-un-blue-text underline underline-offset-4`}
      >
        All priority areas
      </Link>
      <p className={`${typography.eyebrow} mt-6`}>
        {[entity.code, `${budgetEdition} proposed programme budget`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <h1 className={`${typography.pageTitle} mt-2 max-w-4xl`}>
        {entity.name}
      </h1>
      {!selected && (
        <div className="mt-4 max-w-3xl space-y-1">
          <p className={typography.prose}>{description.text}</p>
          <a
            href={description.source.href}
            className={`${typography.meta} text-un-blue-text underline underline-offset-4`}
          >
            {description.source.label}
          </a>
        </div>
      )}
      {entity.priorities.length > 0 && (
        <p className={`${typography.meta} mt-3`}>
          {entity.priorities.join(" · ")}
        </p>
      )}

      {tabs.length > 0 && (
        <SecondaryHeader
          label="Subprogrammes"
          className="mt-6"
          containerClassName="px-0"
          items={[{ href: path, label: "Overview" }, ...tabs]}
          activeHref={selected ? entityHref(entity.id, selected.id) : path}
          renderLink={(props) => (
            <Link
              {...props}
              title={tabs.find((tab) => tab.href === props.href)?.title}
            />
          )}
        />
      )}

      <div className="mt-7 max-w-4xl space-y-8">
        {selected && (
          <div>
            <p className={typography.eyebrow}>Subprogramme {selected.number}</p>
            <h2 className={`${typography.sectionTitle} mt-2`}>
              {selected.name}
            </h2>
          </div>
        )}
        {!selected && tabs.length > 0 && (
          <section className="space-y-3">
            <h2 className={typography.sectionTitle}>Subprogrammes</h2>
            <ul className="divide-y overflow-hidden rounded-lg border">
              {tabs.map((tab) => (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={`${typography.body} flex items-center gap-3 px-4 py-3 hover:bg-muted`}
                  >
                    <span className="shrink-0 font-medium">{tab.label}</span>
                    <span className="flex-1">{tab.title}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {content.map((section, index) => (
          <ContentSections
            key={index}
            content={section}
            heading={
              section.name && section.name !== entity.name
                ? section.name
                : undefined
            }
          />
        ))}
      </div>
    </SiteShell>
  );
}
