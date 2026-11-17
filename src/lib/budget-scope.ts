export type BudgetResultLocation = {
  section: string;
  entity: string;
  subprogrammeId?: string;
  component?: string;
};

export type BudgetScope = Omit<Partial<BudgetResultLocation>, "section"> & {
  sections: string[];
};

export type BudgetHierarchyNode = {
  id: string;
  label: string;
  entityIds: string[];
  scope: BudgetScope;
  children: BudgetHierarchyNode[];
};

export function resultInBudgetScope(
  result: BudgetResultLocation,
  scope: BudgetScope,
) {
  return (
    scope.sections.includes(result.section) &&
    (!scope.entity || scope.entity === result.entity) &&
    (!scope.subprogrammeId || scope.subprogrammeId === result.subprogrammeId) &&
    (!scope.component || scope.component === result.component)
  );
}
