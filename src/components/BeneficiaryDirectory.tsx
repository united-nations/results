"use client";

import { useState } from "react";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { ResultSearchMatches } from "@/components/ResultSearchMatches";
import {
  EntityResultGroups,
  type EntityResults,
} from "@/components/EntityResultGroups";
import { ResultsExpander } from "@/components/ResultsExpander";
import type {
  TaggedEntity,
  TaggedResultSummary,
} from "@/lib/tagged-budget-results";

const beneficiaryOrder = [
  "Refugees, minorities and other groups in vulnerable situations",
  "Women and girls",
  "Youth",
  "Member States",
  "Public administration",
  "Climate and environment",
  "enabling",
  "Private sector, including micro, small and medium-sized enterprises",
  "International community",
];

function isMemberStateCategory(beneficiary: string) {
  return (
    beneficiary.startsWith("Member States ") ||
    beneficiary === "LDCs, LLDCs, SIDS and other developing countries"
  );
}

export function BeneficiaryDirectory({
  entities,
  edition,
}: {
  entities: TaggedEntity[];
  edition: number;
}) {
  const [query, setQuery] = useState("");
  const groups = new Map<string, EntityResults[]>();
  for (const entity of entities) {
    const byBeneficiary = new Map<string, TaggedResultSummary[]>();
    for (const result of entity.results) {
      for (const beneficiary of result.beneficiaries) {
        const group = byBeneficiary.get(beneficiary) ?? [];
        group.push(result);
        byBeneficiary.set(beneficiary, group);
      }
    }
    for (const [beneficiary, results] of byBeneficiary) {
      const group = groups.get(beneficiary) ?? [];
      group.push({ entity, results });
      groups.set(beneficiary, group);
    }
  }

  const categories = [...groups].sort(([a], [b]) => a.localeCompare(b, "en"));
  const memberStates = categories.filter(([name]) =>
    isMemberStateCategory(name),
  );
  const orderedNames = new Set([
    ...beneficiaryOrder,
    ...categories
      .map(([name]) => name)
      .filter((name) => !isMemberStateCategory(name)),
  ]);
  const memberStateCount = new Set(
    memberStates.flatMap(([, groups]) =>
      groups.flatMap(({ results }) => results.map(({ id }) => id)),
    ),
  ).size;

  return (
    <div className="mt-7">
      <div className="max-w-md">
        <SearchInput
          aria-label="Search all results"
          placeholder="Search all results"
          variant="border-bottom"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery("")}
        />
      </div>
      <ResultSearchMatches query={query} edition={edition} />
      <div className="mt-6 space-y-1.5" hidden={Boolean(query.trim())}>
        {[...orderedNames].map((name) => {
          if (name === "Member States" && memberStates.length > 0) {
            return (
              <ResultsExpander
                key={name}
                title={name}
                count={memberStateCount}
                headingLevel={2}
              >
                <div className="my-2 ms-3 space-y-1.5 border-s ps-3">
                  {memberStates.map(([name, groups]) => (
                    <BeneficiaryCategory
                      key={name}
                      name={name}
                      groups={groups}
                      edition={edition}
                      nested
                    />
                  ))}
                </div>
              </ResultsExpander>
            );
          }

          const entityGroups = groups.get(name);
          return entityGroups ? (
            <BeneficiaryCategory
              key={name}
              name={name}
              groups={entityGroups}
              edition={edition}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

function BeneficiaryCategory({
  name,
  groups,
  edition,
  nested,
}: {
  name: string;
  groups: EntityResults[];
  edition: number;
  nested?: boolean;
}) {
  return (
    <ResultsExpander
      title={name === "enabling" ? "Enabling services" : name}
      count={groups.reduce((count, { results }) => count + results.length, 0)}
      nested={nested}
      headingLevel={nested ? 3 : 2}
    >
      <EntityResultGroups
        groups={groups}
        edition={edition}
        headingLevel={nested ? 4 : 3}
      />
    </ResultsExpander>
  );
}
