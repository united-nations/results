import {
  budgetEntities,
  budgetEdition,
  findBudgetEntity,
  type BudgetContent,
} from "@/lib/programme-budget";
import { indexedBudgetResults } from "@/lib/budget-result-index";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return budgetEntities.map(({ id: entity }) => ({ entity }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const entity = findBudgetEntity((await params).entity);
  if (!entity) return new Response(null, { status: 404 });
  const referenceIds = new Map(
    (indexedBudgetResults.get(entity.id) ?? []).map(({ result, reference }) => [
      result,
      reference.id,
    ]),
  );
  const sectionsWithReferences = (sections: BudgetContent[]) =>
    sections.map((section) => ({
      ...section,
      performance: section.performance.map((result) => ({
        ...result,
        referenceId: referenceIds.get(result),
      })),
      planned: section.planned.map((result) => ({
        ...result,
        referenceId: referenceIds.get(result),
      })),
    }));
  return Response.json({
    entity: {
      ...entity,
      overview: sectionsWithReferences(entity.overview),
      subprogrammes: entity.subprogrammes.map((programme) => ({
        ...programme,
        sections: sectionsWithReferences(programme.sections),
      })),
    },
    edition: budgetEdition,
  });
}
