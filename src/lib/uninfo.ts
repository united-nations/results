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
  expenditure?: number | null;
  workspace_countries?: string[];
};

export type UninfoPlan = UninfoPlanSummary & {
  workspace_countries: string[];
  framework: UninfoFrameworkNode[];
  resources?: UninfoResources;
  agencies?: UninfoEntityFinance[];
  agency_finances_retrieved_at?: string | null;
  direct_agency_finances_retrieved_at?: string | null;
  projects: (ResourceActivity & { id: number | null })[];
};

export type UninfoResources = {
  required: number | null;
  available: number | null;
  spent: number | null;
};

export type UninfoEntityFinance = UninfoResources & {
  id: number | string;
  code: string;
  name: string;
};

export type UninfoFrameworkNode = Omit<ResultsFrameworkNode, "children"> & {
  children?: UninfoFrameworkNode[];
  agencies?: UninfoEntityFinance[];
  reported_metrics?: (keyof UninfoResources)[];
};

export type UninfoManifest = {
  countries: Record<string, UninfoCountrySummary>;
  plans: Record<string, UninfoPlanSummary>;
};

export type UninfoAnnualExpenditure = {
  year: number;
  retrieved_at: string;
  uninfoExpenditure: number;
  cebExpenditure: number;
  countryTeamBenchmark: {
    year: number;
    amount: number;
    source: string;
    sourceTitle: string;
    upstreamAttribution: string;
    methodNote: string;
  };
  developmentExpenditure: number;
  humanitarianExpenditure: number;
  developmentSystemActivitiesExpenditure: number;
  cebFunctionsSource: string;
  developmentDefinitionSource: string;
  uninfoCoverageSource: string;
  ratio: number;
  reportingWorkspaces: number;
  reportingCountries: number;
  uninfoSource: string;
  scopeSource: string;
  cebSource: string;
  countries: Record<
    string,
    { workspace_id: number; expenditure: number | null }
  >;
  workspaces: Record<
    string,
    {
      id: number;
      expenditure: number | null;
      countries: string[];
      codes: string[];
    }
  >;
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
