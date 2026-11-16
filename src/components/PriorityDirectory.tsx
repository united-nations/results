"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Chip } from "@un-eosg/ui/components/chip";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";

type EntityGroup = {
  name: string;
  entities: { name: string; code: string | null; href: string }[];
};

type PriorityGroup = EntityGroup & { clusters?: EntityGroup[] };

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function EntityPills({ entities }: { entities: EntityGroup["entities"] }) {
  if (!entities.length) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {entities.map((entity) => (
        <li key={entity.href} className="max-w-full">
          <Chip
            href={entity.href}
            aria-label={
              entity.code ? `${entity.code}, ${entity.name}` : entity.name
            }
            title={entity.name}
          >
            {entity.code ?? entity.name}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

export function PriorityDirectory({ groups }: { groups: PriorityGroup[] }) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  function filterEntities({ name, entities }: EntityGroup) {
    return entities.filter((entity) => {
      const text = normalize(`${name} ${entity.name} ${entity.code ?? ""}`);
      return terms.every((term) => text.includes(term));
    });
  }

  const visible = groups
    .map((group) => ({
      ...group,
      entities: filterEntities(group),
      clusters: group.clusters
        ?.map((cluster) => ({
          ...cluster,
          entities: filterEntities({
            ...cluster,
            name: `${group.name} ${cluster.name}`,
          }),
        }))
        .filter((cluster) => cluster.entities.length > 0),
    }))
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
        <div className="mt-7 sm:columns-2 sm:gap-8">
          {visible.map((group) => (
            <section
              key={group.name}
              className="mb-6 inline-block w-full break-inside-avoid border-t pt-4 align-top"
            >
              <h2 className={typography.sectionTitle}>{group.name}</h2>
              <EntityPills entities={group.entities} />
              {group.clusters?.map((cluster) => (
                <details
                  key={`${cluster.name}-${searching ? query : ""}`}
                  open={searching}
                  className="group mt-3 border-t pt-3"
                >
                  <summary className="flex cursor-pointer items-center gap-2">
                    <ChevronRight
                      className="size-4 shrink-0 group-open:rotate-90"
                      aria-hidden
                    />
                    <h3 className={typography.subTitle}>{cluster.name}</h3>
                  </summary>
                  <EntityPills entities={cluster.entities} />
                </details>
              ))}
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
