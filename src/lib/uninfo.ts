export type UninfoMetrics = {
  required: number;
  available: number;
  spent: number;
};

export type UninfoCountrySummary = {
  name: string;
  workspace_id: number;
  year: number | null;
  projects_year: number | null;
  framework_year: number | null;
  geographic_scope: string;
  workspace_countries: string[];
  project_count: number;
  has_framework: boolean;
  totals: UninfoMetrics;
};

export type FrameworkNode = UninfoMetrics & {
  id: number;
  code: string;
  name: string;
  description?: string;
  children?: FrameworkNode[];
};

export type UninfoCountry = Omit<
  UninfoCountrySummary,
  "project_count" | "has_framework"
> & {
  framework?: FrameworkNode[];
  sdgs: Record<string, UninfoMetrics>;
  projects: (UninfoMetrics & {
    id: number | null;
    row_key: string;
    agency: string;
    name: string;
    description: string | null;
    outcome: string | null;
    start: string | null;
    end: string | null;
  })[];
};
