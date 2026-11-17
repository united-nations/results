"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { BudgetHierarchySelect } from "@/components/BudgetHierarchySelect";
import {
  ResultMatchList,
  ResultSearchFeedback,
} from "@/components/ResultSearchMatches";
import { useResultSearch } from "@/hooks/useResultSearch";
import type { SearchableBudgetResult } from "@/lib/budget-result-index";
import type { BudgetHierarchyNode } from "@/lib/budget-scope";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import { ResultsExpander } from "@/components/ResultsExpander";
import { Button } from "@un-eosg/ui/components/button";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";

type DirectoryEntity = {
  id: string;
  name: string;
  code: string | null;
  href: string;
  description: string;
};

type DirectoryEntry = DirectoryEntity & {
  matches?: SearchableBudgetResult[];
};

type EntityGroup = {
  name: string;
  entities: DirectoryEntity[];
};

type PriorityGroup = EntityGroup & {
  headline?: string;
  officialName?: string;
  clusters?: EntityGroup[];
};

function EntityRow({
  entity,
  edition,
}: {
  entity: DirectoryEntry;
  edition: number;
}) {
  const descriptionId = useId();
  return (
    <li>
      <a
        href={entity.href}
        aria-label={
          entity.code ? `${entity.code}, ${entity.name}` : entity.name
        }
        aria-describedby={descriptionId}
        className="group/row flex items-center gap-3 px-3 py-2.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {entity.code && (
              <span
                className={`${typography.body} font-medium text-un-blue-text`}
              >
                {entity.code}
              </span>
            )}
            <span
              className={`${typography.body} font-medium wrap-break-word text-foreground`}
            >
              {entity.name}
            </span>
          </span>
          <span
            id={descriptionId}
            className={`${typography.body} block group-hover/row:text-un-blue-text`}
          >
            {entity.description}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </a>
      {entity.matches?.length ? (
        <div className="ms-3 border-s">
          <ResultMatchList
            entries={entity.matches}
            edition={edition}
            showOrganization={false}
            pageSize={5}
          />
        </div>
      ) : null}
    </li>
  );
}

const entityPreviewLimit = 5;

function EntityList({
  entities,
  edition,
}: {
  entities: DirectoryEntry[];
  edition: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const remainingId = useId();
  if (!entities.length) return null;

  const remaining = entities.slice(entityPreviewLimit);
  return (
    <>
      <ul role="list" className="divide-y divide-border">
        {entities.slice(0, entityPreviewLimit).map((entity) => (
          <EntityRow key={entity.href} entity={entity} edition={edition} />
        ))}
      </ul>
      {remaining.length > 0 && (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-expanded={showAll}
            aria-controls={remainingId}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show fewer"
              : `Show ${remaining.length} more ${remaining.length === 1 ? "entity" : "entities"}`}
          </Button>
          <ul
            id={remainingId}
            role="list"
            className="divide-y divide-border"
            hidden={!showAll}
          >
            {remaining.map((entity) => (
              <EntityRow key={entity.href} entity={entity} edition={edition} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function PriorityDirectory({
  groups,
  budgetHierarchy,
  edition,
}: {
  groups: PriorityGroup[];
  budgetHierarchy: BudgetHierarchyNode[];
  edition: number;
}) {
  const [query, setQuery] = useState("");
  const [budgetLocation, setBudgetLocation] =
    useState<BudgetHierarchyNode | null>(null);
  const terms = searchTerms(query);
  const searching = terms.length > 0;
  const filtering = searching || Boolean(budgetLocation);
  const scopedEntities = budgetLocation && new Set(budgetLocation.entityIds);
  const search = useResultSearch(query, budgetLocation?.scope);
  const matchesByEntity = new Map<string, SearchableBudgetResult[]>();
  for (const result of search.matches) {
    const matches = matchesByEntity.get(result.entity) ?? [];
    matches.push(result);
    matchesByEntity.set(result.entity, matches);
  }
  function filterEntities({ name, entities }: EntityGroup) {
    return entities.flatMap((entity): DirectoryEntry[] => {
      if (scopedEntities && !scopedEntities.has(entity.id)) return [];
      const text = normalizeSearchText(
        `${name} ${entity.name} ${entity.code ?? ""} ${entity.description}`,
      );
      const matches = matchesByEntity.get(entity.id);
      if (!matches && !terms.every((term) => text.includes(term))) return [];
      const subprogramme = budgetLocation?.scope.subprogrammeId;
      return [
        {
          ...entity,
          href: subprogramme ? `${entity.href}${subprogramme}/` : entity.href,
          matches,
        },
      ];
    });
  }

  const visible = groups
    .map((group) => {
      const labels = [group.name, group.headline, group.officialName].join(" ");
      return {
        ...group,
        entities: filterEntities({ ...group, name: labels }),
        clusters: group.clusters
          ?.map((cluster) => ({
            ...cluster,
            entities: filterEntities({
              ...cluster,
              name: `${labels} ${cluster.name}`,
            }),
          }))
          .filter((cluster) => cluster.entities.length > 0),
      };
    })
    .filter((group) => group.entities.length > 0 || group.clusters?.length);

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-md">
          <SearchInput
            aria-label="Search entities, priority areas or results"
            placeholder="Search entities, priority areas or results"
            variant="border-bottom"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            showClear
            onClear={() => setQuery("")}
          />
        </div>
        <BudgetHierarchySelect
          hierarchy={budgetHierarchy}
          selected={budgetLocation}
          onChange={setBudgetLocation}
        />
      </div>
      <ResultSearchFeedback {...search} />
      <p aria-live="polite" className="sr-only">
        {visible.length} matching priority{" "}
        {visible.length === 1 ? "area" : "areas"}
        {search.status === "ready" &&
          ` and ${search.matches.length} matching ${search.matches.length === 1 ? "result" : "results"}`}
      </p>
      {visible.length > 0 ? (
        <div className="mt-6 space-y-1.5">
          {visible.map((group) => (
            <section key={group.name}>
              <ResultsExpander
                key={JSON.stringify([query, budgetLocation?.id])}
                title={group.headline ?? group.name}
                headingLevel={2}
                count={
                  new Set([
                    ...group.entities.map((entity) => entity.id),
                    ...(group.clusters?.flatMap(({ entities }) =>
                      entities.map((entity) => entity.id),
                    ) ?? []),
                  ]).size
                }
                countUnit="entity"
                defaultOpen={filtering}
              >
                {group.officialName && (
                  <p className={`${typography.meta} px-3 pt-2 pb-1`}>
                    {group.officialName}
                  </p>
                )}
                <EntityList entities={group.entities} edition={edition} />
                {group.clusters?.map((cluster) => (
                  <div key={cluster.name} className="ms-3 mt-1">
                    <ResultsExpander
                      title={cluster.name}
                      headingLevel={3}
                      count={cluster.entities.length}
                      countUnit="entity"
                      defaultOpen={filtering}
                      nested
                    >
                      <EntityList
                        entities={cluster.entities}
                        edition={edition}
                      />
                    </ResultsExpander>
                  </div>
                ))}
              </ResultsExpander>
            </section>
          ))}
        </div>
      ) : search.status === "ready" ? (
        <p className={`${typography.meta} mt-7`}>
          No priority areas, entities or results match your filters.
        </p>
      ) : null}
    </div>
  );
}
