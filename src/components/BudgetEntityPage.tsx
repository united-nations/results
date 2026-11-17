import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { SecondaryHeader } from "@un-eosg/ui/components/secondary-header";
import { typography } from "@un-eosg/ui/typography";
import { BudgetProse } from "@/components/BudgetNarrative";
import { BudgetResultDetails } from "@/components/BudgetResultDetails";
import { ResultSidecar } from "@/components/ResultSidecar";
import { SiteShell } from "@/components/SiteShell";
import { getEntityDescription } from "@/lib/entity-descriptions";
import {
  type BudgetContent,
  type BudgetEntity,
  type BudgetResult,
  type BudgetResultContext,
  type BudgetSubprogramme,
  budgetEdition,
  entityHref,
} from "@/lib/programme-budget";
import { cn } from "@/lib/utils";

function ResultsList({
  results,
  source,
  context,
}: {
  results: BudgetResult[];
  source: string;
  context: BudgetResultContext;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {results.map((result, index) => (
        <li key={index}>
          <ResultSidecar
            title={result.title || "Performance measures"}
            label={result.label}
            source={source}
            context={context}
          >
            <BudgetResultDetails
              result={result}
              source={source}
              edition={budgetEdition}
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
}: {
  content: BudgetContent;
  heading?: string;
  subprogramme: boolean;
  context: BudgetResultContext;
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
            Programme performance in {budgetEdition - 2}
          </BlockHeading>
          <ResultsList
            results={content.performance}
            source={content.source}
            context={context}
          />
        </div>
      )}
      {content.planned.length > 0 && (
        <div className="space-y-3">
          <BlockHeading className={blockStyle}>
            Planned results for {budgetEdition}
          </BlockHeading>
          <ResultsList
            results={content.planned}
            source={content.source}
            context={context}
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
        className={cn(
          typography.meta,
          "inline-flex items-center gap-1.5 text-un-blue-text underline-offset-4 hover:underline",
        )}
      >
        <ArrowLeft aria-hidden className="size-4 shrink-0" />
        All priority areas
      </Link>
      <h1 className={`${typography.pageTitle} mt-5 max-w-4xl text-balance`}>
        {entity.name}
      </h1>
      {!selected && (
        <div className="mt-4 max-w-3xl space-y-1">
          <p className={typography.prose}>{description.text}</p>
          <ExternalLink
            href={description.source.href}
            className={cn(
              typography.caption,
              "text-un-blue-text underline underline-offset-4",
            )}
          >
            {description.source.label}
          </ExternalLink>
        </div>
      )}
      {tabs.length > 0 && (
        <SecondaryHeader
          label="Subprogrammes"
          className="top-[var(--site-header-height,49px)] mt-6 min-[1408px]:top-[var(--site-header-height,49px)]"
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
                    <span
                      className={`${typography.label} shrink-0 text-un-blue-text`}
                    >
                      {tab.label}
                    </span>
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
      </div>
    </SiteShell>
  );
}
