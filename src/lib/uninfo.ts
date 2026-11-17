import type { ResultsFrameworkNode } from "@un-eosg/ui/components/results-framework";
import type { ResourceActivity } from "@un-eosg/ui/components/resource-activity-list";

export type UninfoCountrySummary = {
  name: string;
  plan_ids: number[];
  latest_plan_id: number;
};

export type UninfoPlanSummary = {
  id: number;
  workspace_id: number;
  name: string;
  start: string | null;
  end: string | null;
};

export type UninfoPlan = UninfoPlanSummary & {
  workspace_countries: string[];
  framework: ResultsFrameworkNode[];
  projects: (ResourceActivity & { id: number | null })[];
};

export type UninfoManifest = {
  countries: Record<string, UninfoCountrySummary>;
  plans: Record<string, UninfoPlanSummary>;
};

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPlanPeriod(plan: UninfoPlanSummary): string {
  if (!plan.start || !plan.end) return plan.name || String(plan.id);
  if (plan.start.endsWith("-01-01") && plan.end.endsWith("-12-31"))
    return `${plan.start.slice(0, 4)}–${plan.end.slice(0, 4)}`;
  return `${monthYear.format(new Date(plan.start))}–${monthYear.format(new Date(plan.end))}`;
}
