"use client";

import { useState } from "react";
import { Chip } from "@un-eosg/ui/components/chip";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";

type PriorityGroup = {
  name: string;
  entities: { name: string; code: string | null; href: string }[];
};

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function PriorityDirectory({ groups }: { groups: PriorityGroup[] }) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const visible = groups
    .map((group) => ({
      ...group,
      entities: group.entities.filter((entity) => {
        const text = normalize(
          `${group.name} ${entity.name} ${entity.code ?? ""}`,
        );
        return terms.every((term) => text.includes(term));
      }),
    }))
    .filter((group) => group.entities.length > 0);

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
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.entities.map((entity) => (
                  <li key={entity.href} className="max-w-full">
                    <Chip
                      href={entity.href}
                      aria-label={
                        entity.code
                          ? `${entity.code}, ${entity.name}`
                          : entity.name
                      }
                      title={entity.name}
                    >
                      {entity.code ?? entity.name}
                    </Chip>
                  </li>
                ))}
              </ul>
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
