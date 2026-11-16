"use client";

import { useId, useState } from "react";
import { ChevronRight, Minus, Plus } from "lucide-react";
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

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

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
            {showAll ? "Show fewer" : `Show ${remaining.length} more`}
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

export function PriorityDirectory({ groups }: { groups: PriorityGroup[] }) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  function filterEntities({ name, entities }: EntityGroup) {
    return entities.filter((entity) => {
      const text = normalize(
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
          aria-label="Search priority areas or entities"
          placeholder="Search priority areas or entities"
          variant="border-bottom"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery("")}
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {visible.length} matching groups
      </p>
      {visible.length > 0 ? (
        <div className="mt-6 space-y-1.5">
          {visible.map((group) => (
            <section key={group.name}>
              <details
                key={searching ? query : ""}
                open={searching}
                className="group/priority"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 bg-un-blue-surface px-3 py-2 transition-colors group-open/priority:bg-accent hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <h2 className="text-base font-medium group-open/priority:text-un-blue-text-aaa">
                    {group.headline ?? group.name}
                  </h2>
                  <Plus
                    className="size-4 shrink-0 text-un-blue-text-aaa group-open/priority:hidden"
                    aria-hidden
                  />
                  <Minus
                    className="hidden size-4 shrink-0 text-un-blue-text-aaa group-open/priority:block"
                    aria-hidden
                  />
                </summary>
                {group.officialName && (
                  <p className={`${typography.meta} px-3 pt-2 pb-1`}>
                    {group.officialName}
                  </p>
                )}
                <EntityList entities={group.entities} />
                {group.clusters?.map((cluster) => (
                  <details
                    key={cluster.name}
                    open={searching}
                    className="group/cluster mt-1"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 bg-un-blue-surface py-1.5 ps-5 pe-3 transition-colors group-open/cluster:bg-accent hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                      <h3 className="text-sm font-medium">{cluster.name}</h3>
                      <Plus
                        className="size-4 shrink-0 text-un-blue-text-aaa group-open/cluster:hidden"
                        aria-hidden
                      />
                      <Minus
                        className="hidden size-4 shrink-0 text-un-blue-text-aaa group-open/cluster:block"
                        aria-hidden
                      />
                    </summary>
                    <EntityList entities={cluster.entities} />
                  </details>
                ))}
              </details>
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
