"use client";

import scrollStyles from "./DetailPanelScroll.module.css";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import { FinancialPanelPeriodSelector } from "@un-eosg/ui/components/financial-panel-parts";
import {
  DetailDrawer,
  DrawerTitle,
} from "@un-eosg/ui/components/detail-drawer";
import { DetailPanelControls } from "@un-eosg/ui/components/detail-panel-controls";
import { typography } from "@un-eosg/ui/typography";
import { SearchablePicker } from "@/components/SearchablePicker";
import { UninfoCountryDetails } from "@/components/UninfoCountryDetails";
import { UninfoEvaluationLinks } from "@/components/UninfoEvaluationLinks";
import { UninfoScopeComparison } from "@/components/UninfoScopeComparison";
import annualExpenditure from "../../public/data/uninfo/annual-expenditure-2025.json";
import { normalizeSearchText } from "@/lib/search-text";
import { formatPlanPeriod, type UninfoManifest } from "@/lib/uninfo";

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
  const [selected, setSelected] = useState<string>();
  const [planId, setPlanId] = useState<number>();
  const picker = useRef<HTMLButtonElement>(null);
  const countries = manifest.countries;
  const entries = Object.entries(countries).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, "en"),
  );
  const country = selected ? countries[selected] : undefined;
  const selectedPlan = planId ? manifest.plans[String(planId)] : undefined;
  const periods = (country?.plan_ids ?? []).map((id) => ({
    value: String(id),
    label: formatPlanPeriod(manifest.plans[String(id)]),
  }));
  const periodOptions = periods.map((option) => ({
    ...option,
    label:
      periods.filter((candidate) => candidate.label === option.label).length > 1
        ? `${option.label} (plan ${option.value})`
        : option.label,
  }));
  function select(code: string) {
    setSelected(code);
    const year = String(annualExpenditure.year);
    setPlanId(
      countries[code].plan_ids.find((id) => {
        const plan = manifest.plans[String(id)];
        return (
          plan.start &&
          plan.end &&
          plan.start <= `${year}-12-31` &&
          plan.end >= `${year}-01-01`
        );
      }) ?? countries[code].latest_plan_id,
    );
  }

  return (
    <section aria-labelledby="country-frameworks" className="min-w-0">
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
            <p className={`${typography.caption} mt-4`}>
              {entries.length} countries with available results frameworks
            </p>
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
        <UninfoScopeComparison data={annualExpenditure} />
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
              const matches = entries.filter(([, item]) =>
                normalizeSearchText(item.name).includes(
                  normalizeSearchText(query),
                ),
              );
              return (
                <ul
                  aria-label="Countries with available results frameworks"
                  className="max-h-72 overflow-y-auto p-1"
                >
                  {matches.map(([code, item]) => (
                    <li key={code}>
                      <button
                        type="button"
                        className={`${typography.body} w-full rounded px-3 py-2 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-un-blue any-pointer-coarse:min-h-11`}
                        onClick={() => {
                          close();
                          select(code);
                        }}
                      >
                        {item.name}
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
        <UninfoMap
          countries={countries}
          annual={annualExpenditure}
          onSelect={select}
        />
        <p className={`${typography.caption} mt-3 max-w-3xl leading-relaxed`}>
          Circle area shows reported expenditure in USD for{" "}
          {annualExpenditure.year}. Shared country-team workspaces use one
          circle, with no invented country allocation. Countries without
          positive annual reported expenditure have no circle; their frameworks
          remain available through the map and country selector.
        </p>
      </ChartFrame>
      {country && selectedPlan && (
        <DetailDrawer
          titleId="uninfo-country-title"
          onClose={() => setSelected(undefined)}
          restoreFocusRef={picker}
          swipeToClose
          className="overflow-y-auto sm:w-2/3 sm:min-w-100 md:w-1/2 lg:w-1/3 lg:min-w-125"
        >
          <FinancialDetailPanel
            title={<DrawerTitle>{country.name}</DrawerTitle>}
            titleId="uninfo-country-title"
            className={`${scrollStyles.panel} ${scrollStyles.countryPanel} sm:w-full`}
            contentClassName={scrollStyles.body}
            controls={
              <>
                <div className={scrollStyles.period}>
                  <FinancialPanelPeriodSelector
                    options={periodOptions}
                    selected={String(selectedPlan.id)}
                    onChange={(value) => setPlanId(Number(value))}
                    label="Select plan period"
                    variant="pill"
                  />
                </div>
                <DetailPanelControls
                  close={{
                    label: "Close country results",
                    icon: <X className="size-4" aria-hidden />,
                    onClick: () => setSelected(undefined),
                  }}
                />
              </>
            }
          >
            <p className={`${typography.caption} mb-4`}>
              The map shows {annualExpenditure.year} expenditure. The results
              framework below shows the selected plan’s full-period figures.
            </p>
            <UninfoCountryDetails
              key={selectedPlan.id}
              planId={selectedPlan.id}
            />
            <div className="mt-6">
              <UninfoEvaluationLinks
                key={selected}
                countryCode={selected!}
                currentPeriod={formatPlanPeriod(
                  manifest.plans[String(country.latest_plan_id)],
                )}
              />
            </div>
          </FinancialDetailPanel>
        </DetailDrawer>
      )}
    </section>
  );
}
