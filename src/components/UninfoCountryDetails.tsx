"use client";

import { typography } from "@un-eosg/ui/typography";
import { Button } from "@un-eosg/ui/components/button";
import {
  FinancialPanelHeading,
  FinancialPanelGoalBadge,
} from "@un-eosg/ui/components/financial-panel-parts";
import { ResourceFundingBar } from "@un-eosg/ui/components/resource-funding-bar";
import { ResultsFramework } from "@un-eosg/ui/components/results-framework";
import { ResourceActivityList } from "@un-eosg/ui/components/resource-activity-list";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { usePublicJson } from "@/hooks/usePublicJson";
import type { UninfoCountry, UninfoManifest } from "@/lib/uninfo";

const resourceLabels = {
  required: "Required resources",
  available: "Available resources",
  spent: "Expenditure",
};
const frameworkLabels = {
  ...resourceLabels,
  levels: ["Strategic priority", "Outcome", "Output"],
};

export function UninfoCountryDetails({
  code,
  year,
  goals,
}: {
  code: string;
  year: number;
  goals: UninfoManifest["goals"];
}) {
  const {
    data: country,
    failed,
    retry,
  } = usePublicJson<UninfoCountry>(
    `/data/uninfo/${year}/countries/${code}.json`,
  );
  if (failed)
    return (
      <div role="alert">
        <p className={typography.body}>Country data could not be loaded.</p>
        <Button onClick={retry}>Try again</Button>
      </div>
    );
  if (!country)
    return (
      <p role="status" className={typography.meta}>
        Loading country data…
      </p>
    );

  const sdgs = Object.entries(country.sdgs).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  const maximum = Math.max(
    1,
    ...sdgs.flatMap(([, metrics]) => [
      metrics.required,
      metrics.available,
      metrics.spent,
    ]),
  );
  return (
    <div className="space-y-6">
      <div>
        <FinancialPanelHeading className="mb-1">
          UNSDG Cooperation Framework financials
        </FinancialPanelHeading>
        {country.geographic_scope === "workspace" && (
          <p className={typography.caption}>
            Shared workspace covering {country.workspace_countries.join(", ")}.
          </p>
        )}
        <ExternalLink
          href={`https://uninfo.org/v2/location/${country.workspace_id}/programming/analysis/sdgs`}
          className={`${typography.caption} my-2 inline-flex text-un-blue-text underline underline-offset-2`}
        >
          View on UN INFO
        </ExternalLink>
        {sdgs.length > 0 ? (
          <>
            <FinancialPanelHeading subheading className="mb-2">
              Overall
            </FinancialPanelHeading>
            <ResourceFundingBar {...country.totals} labels={resourceLabels} />
            <FinancialPanelHeading subheading className="mt-4 mb-2">
              By SDG
            </FinancialPanelHeading>
            <div className="space-y-2">
              {sdgs.map(([id, metrics]) => {
                const goal = goals[id];
                const label = goal?.name ?? "Not classified by SDG";
                const color = goal?.color ?? "var(--color-neutral-control)";
                const width =
                  (Math.max(
                    0,
                    metrics.required,
                    metrics.available,
                    metrics.spent,
                  ) /
                    maximum) *
                  100;
                return (
                  <Tooltip
                    key={id}
                    width={340}
                    content={
                      <div className="space-y-2">
                        <p className={typography.body}>{label}</p>
                        <ResourceFundingBar
                          {...metrics}
                          labels={resourceLabels}
                          color={color}
                          compact
                        />
                      </div>
                    }
                  >
                    <div className="flex items-center gap-2" tabIndex={0}>
                      <span
                        className={`${typography.caption} w-24 shrink-0 truncate text-foreground`}
                        title={label}
                      >
                        {label}
                      </span>
                      {goal && (
                        <FinancialPanelGoalBadge label={id} color={color} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block" style={{ width: `${width}%` }}>
                          <ResourceFundingBar
                            {...metrics}
                            labels={resourceLabels}
                            color={color}
                            showLabels={false}
                          />
                        </span>
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </>
        ) : (
          <p className={typography.meta}>
            No financial observations reported for {year}.
          </p>
        )}
      </div>
      <section aria-label="Results framework">
        <FinancialPanelHeading
          className="mb-3"
          controls={
            <span className={typography.caption}>
              Available resources (USD)
            </span>
          }
        >
          Results Framework
        </FinancialPanelHeading>
        {country.framework?.length ? (
          <ResultsFramework
            framework={country.framework}
            labels={frameworkLabels}
          />
        ) : (
          <p className={typography.meta}>
            No published results framework available for {year}.
          </p>
        )}
      </section>
      {country.projects.length > 0 && (
        <section aria-label="Projects">
          <FinancialPanelHeading subheading className="mb-2">
            Projects (
            {new Set(country.projects.map((project) => project.id)).size})
          </FinancialPanelHeading>
          <ResourceActivityList
            activities={country.projects}
            resourceLabels={resourceLabels}
            showAllLabel={`Show all ${country.projects.length} agency-project rows`}
          />
        </section>
      )}
    </div>
  );
}
