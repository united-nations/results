import type { BudgetEntity, BudgetResult } from "./programme-budget";
import type { BudgetResultReference } from "./budget-result-index";

export type IdentifiedBudgetResult = BudgetResult & { referenceId?: string };
export type BudgetOverviewData = { entity: BudgetEntity; edition: number };
export type OverviewResultEntry = {
  summary: BudgetResultReference;
  result: BudgetResult;
};

export function overviewResultEntries(
  entity: BudgetEntity,
): OverviewResultEntry[] {
  const context = {
    entity: { id: entity.id, code: entity.code, name: entity.name },
  };
  const sections = [
    ...entity.overview.map((section) => ({ section, context })),
    ...entity.subprogrammes.flatMap((programme) =>
      programme.sections.map((section) => ({
        section,
        context: {
          ...context,
          subprogramme: {
            id: programme.id,
            number: programme.number,
            name: programme.name,
          },
        },
      })),
    ),
  ];
  return sections.flatMap(({ section, context }) =>
    [...section.performance, ...section.planned].flatMap((result) => {
      const id = (result as IdentifiedBudgetResult).referenceId;
      return id
        ? [
            {
              summary: {
                id,
                entity: entity.id,
                title: result.title || "Performance measures",
                source: section.source,
                context,
              },
              result,
            },
          ]
        : [];
    }),
  );
}
