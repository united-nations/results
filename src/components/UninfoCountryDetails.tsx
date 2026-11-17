"use client";

import { typography } from "@un-eosg/ui/typography";
import { Button } from "@un-eosg/ui/components/button";
import { FinancialPanelHeading } from "@un-eosg/ui/components/financial-panel-parts";
import { ResultsFramework } from "@un-eosg/ui/components/results-framework";
import { usePublicJson } from "@/hooks/usePublicJson";
import type { UninfoPlan } from "@/lib/uninfo";

const resourceLabels = {
  required: "Required resources",
  available: "Available resources",
  spent: "Expenditure",
};
const frameworkLabels = {
  ...resourceLabels,
  levels: ["Strategic priority", "Outcome", "Output"],
};

export function UninfoCountryDetails({ planId }: { planId: number }) {
  const {
    data: plan,
    failed,
    retry,
  } = usePublicJson<UninfoPlan>(`/data/uninfo/plans/${planId}.json`);
  if (failed)
    return (
      <div role="alert">
        <p className={typography.body}>Plan data could not be loaded.</p>
        <Button onClick={retry}>Try again</Button>
      </div>
    );
  if (!plan)
    return (
      <p role="status" className={typography.meta}>
        Loading plan…
      </p>
    );

  return (
    <div className="space-y-6">
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
        {plan.workspace_countries.length > 1 && (
          <p className={`${typography.caption} mb-3`}>
            Shared workspace covering {plan.workspace_countries.join(", ")}.
          </p>
        )}
        {plan.framework?.length ? (
          <ResultsFramework
            framework={plan.framework}
            labels={frameworkLabels}
          />
        ) : (
          <p className={typography.meta}>
            No published results framework available for this plan.
          </p>
        )}
      </section>
    </div>
  );
}
