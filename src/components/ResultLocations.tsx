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
import {
  coverageByLocation,
  displayLocationCodes,
} from "@/lib/result-location-coverage";
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
  const coverage = useMemo(() => coverageByLocation(results), [results]);
  const relevant = results.filter(
    ({ locations }) => locations !== "global" && locations.includes(selected),
  );
  const sections = [
    {
      title: "Country-specific",
      entries: relevant.filter(({ locations }) => locations.length === 1),
      defaultOpen: true,
    },
    {
      title: "Across multiple locations",
      entries: relevant.filter(({ locations }) => locations.length > 1),
      defaultOpen: true,
      showAreas: true,
    },
    { title: "Global", entries: global, defaultOpen: selected === "global" },
  ].filter(({ entries }) => entries.length > 0);

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
        coverage={coverage}
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
            {sections.length === 0 && (
              <p className={typography.meta}>No results for this location.</p>
            )}
            {sections.map(({ title, entries, defaultOpen, showAreas }) => (
              <ResultsExpander
                key={title}
                title={title}
                headingLevel={2}
                count={entries.length}
                defaultOpen={defaultOpen}
              >
                <EntityResultGroups
                  groups={resultsByEntity(entries)}
                  edition={edition}
                  headingLevel={3}
                  renderAfterResult={
                    showAreas
                      ? ({ locations }) =>
                          Array.isArray(locations) && (
                            <TaggedAreas codes={locations} />
                          )
                      : undefined
                  }
                />
              </ResultsExpander>
            ))}
          </SidecarContent>
        )}
      </Dialog.Root>
    </div>
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
      <summary className="cursor-pointer text-muted-foreground">
        {names.length} tagged countries and areas
      </summary>
      <p className="mt-1">{names.join(", ")}</p>
    </details>
  );
}
