"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ResultSearchMatches } from "@/components/ResultSearchMatches";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import { ResultsExpander } from "@/components/ResultsExpander";
import { Button } from "@un-eosg/ui/components/button";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";

type DirectoryEntity = {
  name: string;
  code: string | null;
  href: string;
  description: string;
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

function EntityRow({ entity }: { entity: DirectoryEntity }) {
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
              <span className="text-sm font-medium text-un-blue-text">
                {entity.code}
              </span>
            )}
            <span className={`${typography.meta} wrap-break-word`}>
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
    </li>
  );
}

const entityPreviewLimit = 5;

function EntityList({ entities }: { entities: DirectoryEntity[] }) {
  const [showAll, setShowAll] = useState(false);
  const remainingId = useId();
  if (!entities.length) return null;

  const remaining = entities.slice(entityPreviewLimit);
  return (
    <>
      <ul role="list" className="divide-y divide-border">
        {entities.slice(0, entityPreviewLimit).map((entity) => (
          <EntityRow key={entity.href} entity={entity} />
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
              <EntityRow key={entity.href} entity={entity} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function PriorityDirectory({
  groups,
  edition,
}: {
  groups: PriorityGroup[];
  edition: number;
}) {
  const [query, setQuery] = useState("");
  const terms = searchTerms(query);
  const searching = terms.length > 0;
  function filterEntities({ name, entities }: EntityGroup) {
    return entities.filter((entity) => {
      const text = normalizeSearchText(
        `${name} ${entity.name} ${entity.code ?? ""} ${entity.description}`,
      );
      return terms.every((term) => text.includes(term));
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
      <div className="max-w-md">
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
      <ResultSearchMatches
        query={query}
        edition={edition}
        defaultOpen={visible.length === 0}
      />
      <p aria-live="polite" className="sr-only">
        {visible.length} matching priority{" "}
        {visible.length === 1 ? "area" : "areas"}
      </p>
      {visible.length > 0 ? (
        <div className="mt-6 space-y-1.5">
          {visible.map((group) => (
            <section key={group.name}>
              <ResultsExpander
                key={searching ? query : ""}
                title={group.headline ?? group.name}
                headingLevel={2}
                count={
                  group.entities.length +
                  (group.clusters?.reduce(
                    (count, cluster) => count + cluster.entities.length,
                    0,
                  ) ?? 0)
                }
                countUnit="entity"
                defaultOpen={searching}
              >
                {group.officialName && (
                  <p className={`${typography.meta} px-3 pt-2 pb-1`}>
                    {group.officialName}
                  </p>
                )}
                <EntityList entities={group.entities} />
                {group.clusters?.map((cluster) => (
                  <div key={cluster.name} className="ms-3 mt-1">
                    <ResultsExpander
                      title={cluster.name}
                      headingLevel={3}
                      count={cluster.entities.length}
                      countUnit="entity"
                      defaultOpen={searching}
                      nested
                    >
                      <EntityList entities={cluster.entities} />
                    </ResultsExpander>
                  </div>
                ))}
              </ResultsExpander>
            </section>
          ))}
        </div>
      ) : (
        <p className={`${typography.meta} mt-7`}>
          No priority areas or entities match your search.
        </p>
      )}
    </div>
  );
}
