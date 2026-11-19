"use client";

import { type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { BudgetResultDetails } from "@/components/BudgetResultDetails";
import { ResultSidecar } from "@/components/ResultSidecar";
import { BudgetOverviewSidebar } from "@/components/BudgetOverviewSidebar";
import { PriorityAreaSidebar } from "@/components/PriorityAreaSidebar";
import {
  ContextCardContent,
  contextCardClassName,
} from "@/components/ContextCard";
import { ResultCard } from "@/components/ResultCard";
import { usePublicJson } from "@/hooks/usePublicJson";
import {
  overviewResultEntries,
  type BudgetOverviewData,
} from "@/lib/budget-overview";
import { priorityAreaColors } from "@/lib/priority-area-colors";
import { resultThumbnail } from "@/lib/result-thumbnail";
import { formatBudgetHeading } from "@/lib/budget-text";
import type { BudgetResult } from "@/lib/programme-budget";
import type { BudgetResultReference } from "@/lib/budget-result-index";

function Details({
  summary,
  edition,
  initialResult,
}: {
  summary: BudgetResultReference;
  edition: number;
  initialResult?: BudgetResult;
}) {
  const { data, failed, retry } = usePublicJson<BudgetOverviewData>(
    `/data/entities/${summary.entity}/overview.json`,
  );
  const entries = data ? overviewResultEntries(data.entity) : [];
  const result =
    initialResult ??
    entries.find((entry) => entry.summary.id === summary.id)?.result;
  const context = summary.context;
  const programme = context.subprogramme;
  const color =
    priorityAreaColors[data?.entity.mainPriority ?? ""] ?? "var(--primary)";
  const related = entries
    .filter((entry) => {
      if (entry.summary.id === summary.id) return false;
      if (!entry.summary.context.subprogramme && programme) return false;
      return (
        !programme || entry.summary.context.subprogramme?.id === programme.id
      );
    })
    .slice(0, 4);
  return (
    <div
      className="space-y-8"
      style={{ "--tile-color": color } as CSSProperties}
    >
      {result ? (
        <BudgetResultDetails result={result} edition={edition} />
      ) : (
        <div role="status" className={typography.prose}>
          {failed ? (
            <p>
              The result could not be loaded.{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={retry}
              >
                Try again
              </button>
            </p>
          ) : (
            <p>Loading result details…</p>
          )}
        </div>
      )}
      {related.length > 0 && (
        <section
          aria-label="Related results"
          className="space-y-4 border-t pt-6"
        >
          <h2 className={typography.sectionTitle}>
            {programme
              ? "Other results in this subprogramme"
              : "Other results from this entity"}
          </h2>
          <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            {related.map((entry) => (
              <li key={entry.summary.id}>
                <BudgetResultPreview
                  summary={entry.summary}
                  edition={edition}
                  initialResult={entry.result}
                  cardColor={color}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav
        aria-label="Result context"
        className="flex items-stretch gap-3 *:max-w-1/2"
      >
        {data?.entity.mainPriority && (
          <PriorityAreaSidebar
            priority={data.entity.mainPriority}
            trigger={
              <button
                type="button"
                aria-label={`Priority area: ${data.entity.mainPriority}`}
                className={contextCardClassName}
              >
                <ContextCardContent
                  label="Priority area"
                  title={data.entity.mainPriority}
                />
              </button>
            }
          />
        )}
        <BudgetOverviewSidebar
          entityId={summary.entity}
          title={context.entity.name}
          trigger={
            <button type="button" className={contextCardClassName}>
              <ContextCardContent label="Entity" title={context.entity.name} />
            </button>
          }
        />
        {programme && (
          <BudgetOverviewSidebar
            entityId={summary.entity}
            subprogrammeId={programme.id}
            title={programme.name}
            trigger={
              <button type="button" className={contextCardClassName}>
                <ContextCardContent
                  label={`Subprogramme ${programme.number}`}
                  title={programme.name}
                />
              </button>
            }
          />
        )}
      </nav>
      <footer aria-label="Sources" className="space-y-3 border-t pt-6">
        <h2 className={typography.subTitle}>Sources</h2>
        {result?.figures.map((figure, index) => (
          <ExternalLink
            key={index}
            href={figure.source ?? summary.source}
            className={`${typography.body} block underline underline-offset-4`}
          >
            {figure.label
              ? `View ${figure.label.toLowerCase()} in the budget document`
              : "View figure in the budget document"}
          </ExternalLink>
        ))}
        <ExternalLink
          href={summary.source}
          className={`${typography.body} inline-block underline underline-offset-4`}
        >
          View budget document
        </ExternalLink>
      </footer>
    </div>
  );
}

export function BudgetResultPreview({
  summary,
  edition,
  eyebrow,
  children,
  trigger,
  renderTrigger,
  focusGroup,
  initialResult,
  cardColor,
}: {
  summary: BudgetResultReference;
  edition: number;
  eyebrow?: string;
  children?: ReactNode;
  trigger?: ReactElement;
  renderTrigger?: (trigger: ReactElement) => ReactNode;
  focusGroup?: string;
  initialResult?: BudgetResult;
  cardColor?: string;
}) {
  return (
    <>
      <ResultSidecar
        resultId={summary.id}
        focusGroup={focusGroup}
        title={summary.title}
        source={summary.source}
        eyebrow={eyebrow}
        context={summary.context}
        trigger={
          trigger ?? (
            <ResultCard
              resultTitle={formatBudgetHeading(summary.title)}
              thumbnail={
                initialResult
                  ? resultThumbnail(initialResult, edition)
                  : undefined
              }
              color={cardColor}
            />
          )
        }
        renderTrigger={renderTrigger}
      >
        <Details
          summary={summary}
          edition={edition}
          initialResult={initialResult}
        />
      </ResultSidecar>
      {children}
    </>
  );
}
