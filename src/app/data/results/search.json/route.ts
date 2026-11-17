import {
  indexedBudgetResults,
  type SearchableBudgetResult,
} from "@/lib/budget-result-index";
import { budgetEdition } from "@/lib/programme-budget";
import { normalizeSearchText } from "@/lib/search-text";
import { taggedEntities } from "@/lib/tagged-budget-results";

export const dynamic = "force-static";

export function GET() {
  const beneficiaries = new Map(
    taggedEntities.flatMap((entity) =>
      entity.results.map(
        (result) => [result.id, result.beneficiaries] as const,
      ),
    ),
  );
  const entries = [...indexedBudgetResults.values()].flatMap((rows) =>
    rows.map(
      ({
        reference,
        organization,
        subprogramme,
        result,
        kind,
        location,
      }): SearchableBudgetResult => ({
        ...reference,
        organization,
        subprogramme,
        kind,
        location,
        year:
          kind === "planned"
            ? budgetEdition
            : (result.performanceYear ?? budgetEdition - 2),
        text: normalizeSearchText(
          [
            reference.title,
            organization,
            subprogramme,
            result.narrative,
            ...result.measures.map((measure) => measure.label),
            ...result.figures.flatMap((figure) => [
              figure.title,
              figure.subtitle,
            ]),
            ...(beneficiaries.get(reference.id) ?? []),
          ].join(" "),
        ),
      }),
    ),
  );
  return Response.json(entries);
}
