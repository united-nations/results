"use client";

import { typography } from "@un-eosg/ui/typography";
import { Button } from "@un-eosg/ui/components/button";
import {
  FinancialPanelHeading,
  FinancialPanelTotalRow,
} from "@un-eosg/ui/components/financial-panel-parts";
import { formatBudget } from "@un-eosg/ui/format-budget";
import { UninfoResultsFramework } from "@/components/UninfoResultsFramework";
import { usePublicJson } from "@/hooks/usePublicJson";
import type { UninfoPlan } from "@/lib/uninfo";

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
      <section aria-label="Framework expenditure overview">
        <FinancialPanelHeading className="mb-3">
          {plan.workspace_countries.length > 1
            ? "Shared framework overview"
            : "Country framework overview"}
        </FinancialPanelHeading>
        {plan.workspace_countries.length > 1 && (
          <p className={`${typography.caption} mb-3`}>
            Shared workspace covering {plan.workspace_countries.join(", ")}.
          </p>
        )}
        <FinancialPanelTotalRow
          label="Expenditure"
          value={
            plan.resources?.spent == null
              ? "Not reported"
              : formatBudget(plan.resources.spent)
          }
        />
      </section>
      <section aria-label="Results framework">
        <FinancialPanelHeading
          className="mb-3"
          controls={
            <span className={typography.caption}>Expenditure (USD)</span>
          }
        >
          Results Framework
        </FinancialPanelHeading>
        {plan.framework?.length ? (
          <UninfoResultsFramework framework={plan.framework} />
        ) : (
          <p className={typography.meta}>
            No published results framework available for this plan.
          </p>
        )}
      </section>
    </div>
  );
}
