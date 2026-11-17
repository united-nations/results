"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import { FinancialPanelYearSelector } from "@un-eosg/ui/components/financial-panel-parts";
import {
  DetailDrawer,
  DrawerTitle,
} from "@un-eosg/ui/components/detail-drawer";
import { DetailPanelControls } from "@un-eosg/ui/components/detail-panel-controls";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";
import { SearchablePicker } from "@/components/SearchablePicker";
import { UninfoCountryDetails } from "@/components/UninfoCountryDetails";
import { usePublicJson } from "@/hooks/usePublicJson";
import { normalizeSearchText } from "@/lib/search-text";
import type { UninfoCountrySummary, UninfoManifest } from "@/lib/uninfo";

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
  manifest,
}: {
  manifest: UninfoManifest;
}) {
  const [year, setYear] = useState(manifest.default_year);
  const [selected, setSelected] = useState<{ code: string; name: string }>();
  const picker = useRef<HTMLButtonElement>(null);
  const {
    data: index,
    failed,
    retry,
  } = usePublicJson<Record<string, UninfoCountrySummary>>(
    `/data/uninfo/${year}/uninfo-countries-index.json`,
  );
  const countries = Object.fromEntries(
    Object.entries(index ?? {}).filter(([, country]) => country.has_framework),
  );
  const entries = Object.entries(countries).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, "en"),
  );
  function select(code: string) {
    setSelected({ code, name: countries[code].name });
  }
  const yearControl = {
    years: [...manifest.years].reverse(),
    selected: year,
    onChange: setYear,
    label: "Select year",
  };

  return (
    <section aria-labelledby="country-frameworks" className="mt-8">
      <ChartFrame
        header={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="country-frameworks" className={typography.sectionTitle}>
                Country Results Frameworks
              </h2>
              <FinancialPanelYearSelector {...yearControl} variant="pill" />
            </div>
            <p className={`${typography.body} mt-2`}>
              Explore UN country teams’ strategic priorities, outcomes, outputs
              and activities in UN INFO.
            </p>
            {index && (
              <p
                className={`${typography.caption} mt-4 flex items-center gap-2`}
              >
                <span aria-hidden className="size-3 rounded-sm bg-un-blue" />
                {entries.length} countries with available results frameworks
              </p>
            )}
          </>
        }
        footer={
          <p className={`${typography.caption} mt-4`}>
            Source{" "}
            <a
              href="https://uninfo.org/"
              target="_blank"
              rel="noreferrer"
              className="text-un-blue-text underline underline-offset-2"
            >
              UN INFO
            </a>
            .
          </p>
        }
      >
        {failed ? (
          <div role="alert" className="py-10">
            <p className={typography.body}>
              Framework coverage could not be loaded.
            </p>
            <Button onClick={retry}>Try again</Button>
          </div>
        ) : !index ? (
          <p role="status" className={`${typography.meta} py-16`}>
            Loading {year} frameworks…
          </p>
        ) : (
          <>
            <div
              className="mt-4 w-fit max-w-full"
              ref={(node) => {
                picker.current = node?.querySelector("button") ?? null;
              }}
            >
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
                      aria-label="Countries with available results frameworks"
                      className="max-h-72 overflow-y-auto p-1"
                    >
                      {matches.map(([code, country]) => (
                        <li key={code}>
                          <button
                            type="button"
                            className={`${typography.body} w-full rounded px-3 py-2 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-un-blue`}
                            onClick={() => {
                              close();
                              select(code);
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
            <UninfoMap countries={countries} onSelect={select} />
          </>
        )}
      </ChartFrame>
      {selected && (
        <DetailDrawer
          titleId="uninfo-country-title"
          onClose={() => setSelected(undefined)}
          restoreFocusRef={picker}
          swipeToClose
          className="overflow-hidden sm:w-2/3 sm:min-w-100 md:w-1/2 lg:w-1/3 lg:min-w-125"
        >
          <FinancialDetailPanel
            title={<DrawerTitle>{selected.name}</DrawerTitle>}
            titleId="uninfo-country-title"
            className="sm:w-full"
            yearSelectorPlacement="header"
            yearSelector={yearControl}
            controls={
              <DetailPanelControls
                close={{
                  label: "Close country results",
                  icon: <X className="size-4" aria-hidden />,
                  onClick: () => setSelected(undefined),
                }}
              />
            }
          >
            {index && !index[selected.code] ? (
              <p className={typography.meta}>
                No published results framework available for {year}.
              </p>
            ) : (
              <UninfoCountryDetails
                key={`${selected.code}-${year}`}
                code={selected.code}
                year={year}
                goals={manifest.goals}
              />
            )}
          </FinancialDetailPanel>
        </DetailDrawer>
      )}
    </section>
  );
}
