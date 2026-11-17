import type { ResourceMetrics } from "@un-eosg/ui/components/resource-funding-bar";
import type { ResultsFrameworkNode } from "@un-eosg/ui/components/results-framework";
import type { ResourceActivity } from "@un-eosg/ui/components/resource-activity-list";

export type UninfoCountrySummary = {
  name: string;
  workspace_id: number;
  year: number;
  geographic_scope: string;
  workspace_countries: string[];
  project_count: number;
  has_framework: boolean;
  totals: ResourceMetrics;
};

export type UninfoCountry = UninfoCountrySummary & {
  framework?: ResultsFrameworkNode[];
  sdgs: Record<string, ResourceMetrics>;
  projects: (ResourceActivity & { id: number | null; sdg: number | null })[];
};

export type UninfoManifest = {
  years: number[];
  default_year: number;
  goals: Record<string, { name: string; color: string }>;
};
