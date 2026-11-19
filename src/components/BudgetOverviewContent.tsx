import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { BudgetProse } from "@/components/BudgetNarrative";
import { BudgetResultDetails } from "@/components/BudgetResultDetails";
import { ResultSidecar } from "@/components/ResultSidecar";
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
    <ul className="divide-y overflow-hidden rounded-lg border">
      {results.map((result, index) => (
        <li key={index}>
          <ResultSidecar
            resultId={result.referenceId}
            title={result.title || "Performance measures"}
            label={result.label}
            source={source}
            context={context}
          >
            <BudgetResultDetails
              result={result}
              source={source}
              edition={edition}
            />
          </ResultSidecar>
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
      <ExternalLink
        href={content.source}
        className={cn(
          typography.caption,
          "inline-block text-un-blue-text underline underline-offset-4",
        )}
      >
        {content.symbol}
      </ExternalLink>
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
  onSelectSubprogramme?: (id: string) => void;
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
                  {onSelectSubprogramme ? (
                    <button
                      type="button"
                      className={className}
                      onClick={() => onSelectSubprogramme(programme.id)}
                    >
                      {label}
                    </button>
                  ) : (
                    <Link
                      className={className}
                      href={`/entities/${entity.id}/${programme.id}/`}
                    >
                      {label}
                    </Link>
                  )}
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
    </>
  );
}
