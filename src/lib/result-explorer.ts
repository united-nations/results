import type { BudgetResultReference } from "./budget-result-index";
import type { ResultThumbnailData } from "./result-thumbnail";
import { normalizeSearchText, searchTerms } from "./search-text";

export type ExplorerResult = {
  id: string;
  reference: BudgetResultReference;
  title: string;
  organization: string;
  priority: string;
  beneficiaries: string[];
  groupColor?: string;
  thumbnail?: ResultThumbnailData;
  locations: string[] | "global" | null;
  budgetKeys: string[];
  searchText: string;
};
export type FilterDimension =
  "priority" | "beneficiary" | "location" | "budget";
export type ExplorerFilters = Record<FilterDimension, string[]>;
export type ExplorerOption = {
  value: string;
  label: string;
  parent?: string;
  treeLabel?: string;
};
export type ExplorerOptions = Record<FilterDimension, ExplorerOption[]>;
export const emptyExplorerFilters: ExplorerFilters = {
  priority: [],
  beneficiary: [],
  location: [],
  budget: [],
};
export const unclassified = "__unclassified";
export const globalLocation = "__global";

export function resultFacetValues(
  result: ExplorerResult,
  dimension: FilterDimension,
) {
  switch (dimension) {
    case "priority":
      return [result.priority];
    case "beneficiary":
      return result.beneficiaries.length
        ? result.beneficiaries
        : [unclassified];
    case "location":
      return result.locations === "global"
        ? [globalLocation]
        : result.locations?.length
          ? result.locations
          : [unclassified];
    case "budget":
      return result.budgetKeys;
  }
}

export function filterExplorerResults(
  results: ExplorerResult[],
  filters: ExplorerFilters,
  query: string,
  omit?: FilterDimension,
) {
  const terms = searchTerms(query);
  return results.filter(
    (result) =>
      terms.every((term) => result.searchText.includes(term)) &&
      (Object.keys(filters) as FilterDimension[]).every(
        (dimension) =>
          dimension === omit ||
          !filters[dimension].length ||
          resultFacetValues(result, dimension).some((value) =>
            filters[dimension].includes(value),
          ),
      ),
  );
}

export type ExplorerSuggestion = {
  dimension: FilterDimension;
  value: string;
  label: string;
  kind: string;
};

export function explorerSuggestions(
  options: ExplorerOptions,
  filters: ExplorerFilters,
  query: string,
): ExplorerSuggestion[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const kinds: Record<string, string> = {
    priority: "Priority area",
    beneficiary: "Beneficiary",
    location: "Location",
    part: "Budget part",
    section: "Budget section",
    entity: "Entity",
    programme: "Subprogramme",
    component: "Component",
  };
  const order = [
    "Location",
    "Priority area",
    "Beneficiary",
    "Entity",
    "Subprogramme",
    "Budget section",
    "Budget part",
    "Component",
  ];
  const phrase = normalizeSearchText(query).trim();
  const candidates = (Object.keys(options) as FilterDimension[])
    .flatMap((dimension) =>
      options[dimension].flatMap((option) => {
        if (filters[dimension].includes(option.value)) return [];
        const label = normalizeSearchText(option.label);
        if (!terms.every((term) => label.includes(term))) return [];
        const kind =
          kinds[
            dimension === "budget" ? option.value.split(":")[0] : dimension
          ];
        return [
          {
            dimension,
            value: option.value,
            label: option.label,
            kind,
            score: label === phrase ? 0 : label.startsWith(phrase) ? 1 : 2,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        a.score - b.score ||
        order.indexOf(a.kind) - order.indexOf(b.kind) ||
        a.label.localeCompare(b.label),
    );
  const perKind = new Map<string, number>();
  return candidates
    .filter((item) => {
      const count = perKind.get(item.kind) ?? 0;
      perKind.set(item.kind, count + 1);
      return count < 3;
    })
    .slice(0, 8)
    .map(({ dimension, value, label, kind }) => ({
      dimension,
      value,
      label,
      kind,
    }));
}
