"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { typography } from "@un-eosg/ui/typography";
import { SearchablePicker } from "@/components/SearchablePicker";
import { SidecarContent } from "@/components/SidecarContent";
import { UninfoCountryDetails } from "@/components/UninfoCountryDetails";
import { normalizeSearchText } from "@/lib/search-text";
import type { UninfoCountrySummary } from "@/lib/uninfo";

const UninfoMap = dynamic(
  () =>
    import("@/components/UninfoChoropleth").then(
      (module) => module.UninfoChoropleth,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className={`${typography.meta} py-16 text-center`}>
        Loading map…
      </p>
    ),
  },
);

export function CountryResultsFrameworks({
  countries,
}: {
  countries: Record<string, UninfoCountrySummary>;
}) {
  const [selected, setSelected] = useState<string>();
  const picker = useRef<HTMLDivElement>(null);
  const entries = Object.entries(countries).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, "en"),
  );

  return (
    <section aria-labelledby="country-frameworks" className="mt-8">
      <ChartFrame
        header={
          <>
            <h2 id="country-frameworks" className={typography.sectionTitle}>
              Country Results Frameworks
            </h2>
            <p className={`${typography.body} mt-2`}>
              Explore UN country teams’ strategic priorities, outcomes, outputs
              and activities in UN INFO.
            </p>
            <div className={`${typography.caption} mt-4 flex flex-wrap gap-5`}>
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-sm bg-un-blue" />
                {entries.length} countries and areas with data
              </span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 rounded-sm border border-border bg-muted"
                />
                No data in this snapshot
              </span>
            </div>
          </>
        }
        footer={
          <p className={`${typography.caption} mt-4`}>
            Select a highlighted country or use the country selector. Source{" "}
            <a
              href="https://uninfo.org/"
              target="_blank"
              rel="noreferrer"
              className="text-un-blue-text underline underline-offset-2"
            >
              UN INFO
            </a>
            . Retained snapshot imported from open. Country SDG finances are
            labelled with their verified reporting year.
          </p>
        }
      >
        <div ref={picker} className="mt-4 w-fit max-w-full">
          <SearchablePicker
            label="Choose a country or area"
            searchLabel="Search countries or areas"
            className="w-80 max-w-[calc(100vw-2rem)] p-0"
          >
            {(query, close) => {
              const matches = entries.filter(([, country]) =>
                normalizeSearchText(country.name).includes(
                  normalizeSearchText(query),
                ),
              );
              return (
                <ul
                  aria-label="Countries and areas with UN INFO data"
                  className="max-h-72 overflow-y-auto p-1"
                >
                  {matches.map(([code, country]) => (
                    <li key={code}>
                      <button
                        type="button"
                        className={`${typography.body} w-full rounded px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-un-blue`}
                        onClick={() => {
                          close();
                          setSelected(code);
                        }}
                      >
                        {country.name}
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && (
                    <li className={`${typography.meta} p-3`}>
                      No matching countries or areas.
                    </li>
                  )}
                </ul>
              );
            }}
          </SearchablePicker>
        </div>
        <UninfoMap countries={countries} onSelect={setSelected} />
      </ChartFrame>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        {selected && (
          <SidecarContent
            title={countries[selected].name}
            eyebrow="UN INFO results framework"
            closeLabel="Close country results"
            onClose={() => setSelected(undefined)}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              picker.current?.querySelector("button")?.focus();
            }}
          >
            <UninfoCountryDetails key={selected} code={selected} />
          </SidecarContent>
        )}
      </Dialog.Root>
    </section>
  );
}
