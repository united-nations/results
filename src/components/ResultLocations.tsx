"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { HierarchicalSingleSelect } from "@un-eosg/ui/components/hierarchical-single-select";
import {
  EntityResultGroups,
  type EntityResults,
} from "@/components/EntityResultGroups";
import { typography } from "@un-eosg/ui/typography";
import { ResultsExpander } from "@/components/ResultsExpander";
import { SidecarContent } from "@/components/SidecarContent";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import {
  displayLocationCodes,
  namedLocationGroup,
  namedLocationGroups,
} from "@/lib/result-location-groups";
import type {
  TaggedEntity,
  TaggedResultSummary,
} from "@/lib/tagged-budget-results";
import locationData from "../../data/result-locations.json";

const LocationsMap = dynamic(
  () =>
    import("@/components/LocationChoropleth").then(
      (module) => module.LocationChoropleth,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center" role="status">
        Loading map…
      </p>
    ),
  },
);

const locations: Record<string, { name: string }> = locationData;
const regionNames = new Intl.DisplayNames(["en"], {
  type: "region",
  fallback: "none",
});
const areaName = (code: string) =>
  locations[code]?.name ?? regionNames.of(code) ?? code;
const sortedLocations = Object.entries(locations).sort(([, a], [, b]) =>
  a.name.localeCompare(b.name, "en"),
);

const locationOptions = [
  { id: "global", label: "Global", children: [] },
  ...sortedLocations.map(([id, { name: label }]) => ({
    id,
    label,
    children: [],
  })),
];

type Entry = {
  summary: TaggedResultSummary;
  entity: EntityResults["entity"];
  locations: string[] | "global";
};

function resultsByEntity(entries: Entry[]) {
  const groups = new Map<string, EntityResults>();
  for (const { entity, summary } of entries) {
    const group = groups.get(entity.id) ?? { entity, results: [] };
    group.results.push(summary);
    groups.set(entity.id, group);
  }
  return [...groups.values()];
}

export function ResultLocations({
  entities,
  edition,
}: {
  entities: TaggedEntity[];
  edition: number;
}) {
  const [selected, setSelected] = useState("");
  const picker = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () =>
      entities.flatMap((entity) =>
        entity.results.map((summary) => ({
          summary,
          entity,
          locations:
            summary.locations === "global"
              ? ("global" as const)
              : displayLocationCodes(summary.locations),
        })),
      ),
    [entities],
  );
  const global = results.filter(({ locations }) => locations === "global");
  const coveredCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const { locations } of results) {
      if (locations !== "global") {
        for (const code of locations) codes.add(code);
      }
    }
    return codes;
  }, [results]);
  const relevant = results.filter(
    ({ locations }) => locations !== "global" && locations.includes(selected),
  );
  const multiLocationResults = new Map<string | undefined, typeof relevant>();
  for (const entry of relevant) {
    const { locations, summary } = entry;
    if (locations.length < 2 || summary.locations === "global") continue;
    const title = namedLocationGroup(summary.locations)?.title;
    const entries = multiLocationResults.get(title) ?? [];
    entries.push(entry);
    multiLocationResults.set(title, entries);
  }
  const countrySpecific = relevant.filter(
    ({ locations }) => locations.length === 1,
  );
  const otherLocations = multiLocationResults.get(undefined) ?? [];
  const namedGroups = namedLocationGroups.flatMap((group) => {
    const entries = multiLocationResults.get(group.title);
    return entries ? [{ ...group, entries }] : [];
  });

  return (
    <div className="mt-6 space-y-4">
      <div ref={picker} className="w-fit">
        <HierarchicalSingleSelect
          groups={locationOptions}
          selected={selected}
          onChange={setSelected}
          getLabel={(code) =>
            code === "global"
              ? "Global"
              : code
                ? areaName(code)
                : "Choose a country or area"
          }
        />
      </div>
      <LocationsMap
        coveredCodes={coveredCodes}
        hasGlobal={global.length > 0}
        getAreaName={areaName}
        onSelect={setSelected}
      />
      <p className={typography.caption}>
        The boundaries and names shown and the designations used on this map do
        not imply official endorsement or acceptance by the United Nations.
      </p>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected("");
        }}
      >
        {selected && (
          <SidecarContent
            title={
              selected === "global" ? "Global results" : areaName(selected)
            }
            closeLabel="Close location"
            onClose={() => setSelected("")}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              picker.current?.querySelector("button")?.focus();
            }}
          >
            {relevant.length === 0 && selected !== "global" && (
              <p className={typography.meta}>
                There are no results tagged specifically to this location.
              </p>
            )}
            {countrySpecific.length > 0 && (
              <ResultsExpander
                title="Country-specific"
                headingLevel={2}
                count={countrySpecific.length}
                defaultOpen
              >
                <FlatResultList entries={countrySpecific} edition={edition} />
              </ResultsExpander>
            )}
            {relevant.length > countrySpecific.length && (
              <ResultsExpander
                title="Across multiple locations"
                headingLevel={2}
                count={relevant.length - countrySpecific.length}
                defaultOpen
              >
                <div className="mt-2 space-y-2 border-s ps-3">
                  {namedGroups.map(({ title, codes, entries }) => (
                    <ResultsExpander
                      key={title}
                      title={title}
                      headingLevel={3}
                      count={entries.length}
                      nested
                    >
                      <div className="border-b pt-2">
                        <TaggedAreas codes={codes.split(" ")} />
                      </div>
                      <EntityResultGroups
                        groups={resultsByEntity(entries)}
                        edition={edition}
                        headingLevel={4}
                      />
                    </ResultsExpander>
                  ))}
                  {otherLocations.length > 0 && (
                    <ResultsExpander
                      title="Other multi-location results"
                      headingLevel={3}
                      count={otherLocations.length}
                      nested
                      defaultOpen
                    >
                      <EntityResultGroups
                        groups={resultsByEntity(otherLocations)}
                        edition={edition}
                        headingLevel={4}
                        renderAfterResult={(summary) =>
                          Array.isArray(summary.locations) && (
                            <TaggedAreas codes={summary.locations} />
                          )
                        }
                      />
                    </ResultsExpander>
                  )}
                </div>
              </ResultsExpander>
            )}
            {global.length > 0 && (
              <ResultsExpander
                title="Global"
                headingLevel={2}
                count={global.length}
                defaultOpen={selected === "global"}
              >
                <FlatResultList entries={global} edition={edition} />
              </ResultsExpander>
            )}
          </SidecarContent>
        )}
      </Dialog.Root>
    </div>
  );
}

function FlatResultList({
  entries,
  edition,
}: {
  entries: Entry[];
  edition: number;
}) {
  return (
    <ul className="divide-y">
      {entries.map(({ summary, entity }) => (
        <li key={summary.id}>
          <BudgetResultPreview
            summary={summary}
            edition={edition}
            supportingText={entity.code ?? entity.name}
          />
        </li>
      ))}
    </ul>
  );
}

function TaggedAreas({ codes }: { codes: string[] }) {
  const names = displayLocationCodes(codes)
    .map(areaName)
    .sort((a, b) => a.localeCompare(b, "en"));
  if (names.length <= 8) {
    return (
      <p className={`${typography.caption} px-4 pb-2`}>{names.join(", ")}</p>
    );
  }
  return (
    <details className={`${typography.caption} px-4 pb-2`}>
      <summary className="cursor-pointer text-un-blue-text">
        {names.length} tagged countries and areas
      </summary>
      <p className="mt-1">{names.join(", ")}</p>
    </details>
  );
}
