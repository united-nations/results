import { PriorityAreaSidebar } from "@/components/PriorityAreaSidebar";
import { BudgetOverviewSidebar } from "@/components/BudgetOverviewSidebar";
import {
  ContextCardContent,
  contextCardClassName,
} from "@/components/ContextCard";
import { ChevronRight } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { BudgetProse } from "@/components/BudgetNarrative";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import type {
  BudgetContent,
  BudgetEntity,
  BudgetResult,
  BudgetResultContext,
  BudgetSubprogramme,
} from "@/lib/programme-budget";
import { cn } from "@/lib/utils";

function ResultsList({
  results,
  source,
  context,
  edition,
}: {
  results: (BudgetResult & { referenceId?: string })[];
  source: string;
  context: BudgetResultContext;
  edition: number;
}) {
  return (
    <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
      {results.map((result, index) => (
        <li key={index}>
          <BudgetResultPreview
            summary={{
              id:
                result.referenceId ?? JSON.stringify([context, source, result]),
              entity: context.entity.id,
              title: result.title || "Performance measures",
              source,
              context,
            }}
            edition={edition}
            initialResult={result}
          />
        </li>
      ))}
    </ul>
  );
}

function ContentSections({
  content,
  heading,
  subprogramme,
  context,
  edition,
}: {
  content: BudgetContent;
  heading?: string;
  subprogramme: boolean;
  context: BudgetResultContext;
  edition: number;
}) {
  const SectionHeading = subprogramme ? "h3" : "h2";
  const BlockHeading = heading ? (subprogramme ? "h4" : "h3") : SectionHeading;
  const blockStyle =
    BlockHeading === "h2"
      ? typography.sectionTitle
      : cn(typography.subTitle, heading && subprogramme && "font-medium");
  const proseHeadingLevel =
    BlockHeading === "h4" ? 5 : BlockHeading === "h3" ? 4 : 3;
  return (
    <section className="space-y-9">
      {heading && (
        <SectionHeading
          className={
            subprogramme ? typography.subTitle : typography.sectionTitle
          }
        >
          {heading}
        </SectionHeading>
      )}
      {content.objectives.length > 0 && (
        <div className="space-y-3 border-s-2 border-un-blue bg-muted/40 px-4 py-4 sm:px-5">
          <BlockHeading className={blockStyle}>Objective</BlockHeading>
          <BudgetProse
            paragraphs={content.objectives}
            headingLevel={proseHeadingLevel}
          />
        </div>
      )}
      {content.strategy.length > 0 && (
        <div className="space-y-3">
          <BlockHeading className={blockStyle}>Strategy</BlockHeading>
          <BudgetProse
            paragraphs={content.strategy}
            headingLevel={proseHeadingLevel}
          />
        </div>
      )}
      {content.performance.length > 0 && (
        <div className="space-y-3">
          <BlockHeading className={blockStyle}>
            Programme performance in {edition - 2}
          </BlockHeading>
          <ResultsList
            results={content.performance}
            source={content.source}
            context={context}
            edition={edition}
          />
        </div>
      )}
      {content.planned.length > 0 && (
        <div className="space-y-3">
          <BlockHeading className={blockStyle}>
            Planned results for {edition}
          </BlockHeading>
          <ResultsList
            results={content.planned}
            source={content.source}
            context={context}
            edition={edition}
          />
        </div>
      )}
    </section>
  );
}

export function BudgetOverviewContent({
  entity,
  selected,
  edition,
  onSelectSubprogramme,
}: {
  entity: BudgetEntity;
  selected?: BudgetSubprogramme;
  edition: number;
  onSelectSubprogramme: (id: string) => void;
}) {
  const content = selected
    ? selected.sections.toSorted(
        (a, b) => Number(Boolean(a.name)) - Number(Boolean(b.name)),
      )
    : entity.overview;
  return (
    <>
      {!selected && entity.subprogrammes.length > 0 && (
        <section className="space-y-3">
          <h2 className={typography.sectionTitle}>Subprogrammes</h2>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {entity.subprogrammes.map((programme) => {
              const label = (
                <>
                  <span
                    className={`${typography.label} shrink-0 text-un-blue-text`}
                  >
                    SP {programme.number}
                  </span>
                  <span className="flex-1">{programme.name}</span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </>
              );
              const className = `${typography.body} flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted`;
              return (
                <li key={programme.id}>
                  <button
                    type="button"
                    className={className}
                    onClick={() => onSelectSubprogramme(programme.id)}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {content.map((section, index) => (
        <ContentSections
          key={index}
          content={section}
          edition={edition}
          subprogramme={Boolean(selected)}
          context={{
            entity: { id: entity.id, code: entity.code, name: entity.name },
            ...(selected
              ? {
                  subprogramme: {
                    id: selected.id,
                    number: selected.number,
                    name: selected.name,
                  },
                }
              : {}),
          }}
          heading={
            section.name && section.name !== entity.name
              ? section.name
              : undefined
          }
        />
      ))}
      {(entity.mainPriority || selected) && (
        <nav
          aria-label="Overview context"
          className="flex items-stretch gap-3 *:max-w-1/2"
        >
          {entity.mainPriority && (
            <PriorityAreaSidebar
              priority={entity.mainPriority}
              trigger={
                <button
                  type="button"
                  className={contextCardClassName}
                  aria-label={`Priority area: ${entity.mainPriority}`}
                >
                  <ContextCardContent
                    label="Priority area"
                    title={entity.mainPriority}
                  />
                </button>
              }
            />
          )}
          {selected && (
            <BudgetOverviewSidebar
              entityId={entity.id}
              title={entity.name}
              trigger={
                <button type="button" className={contextCardClassName}>
                  <ContextCardContent label="Entity" title={entity.name} />
                </button>
              }
            />
          )}
        </nav>
      )}
      <footer aria-label="Sources" className="space-y-3 border-t pt-6">
        <h2 className={typography.subTitle}>Sources</h2>
        {[
          ...new Map(
            content.map((section) => [section.source, section]),
          ).values(),
        ].map((section) => (
          <ExternalLink
            key={section.source}
            href={section.source}
            className={`${typography.body} block underline underline-offset-4`}
          >
            View budget document ({section.symbol})
          </ExternalLink>
        ))}
      </footer>
    </>
  );
}
