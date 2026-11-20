import {
  budgetEntities,
  budgetEdition,
  findBudgetEntity,
} from "@/lib/programme-budget";
import { budgetEntityWithReferences } from "@/lib/budget-result-index";
import { taggedEntities } from "@/lib/tagged-budget-results";
import type { BudgetContent, BudgetResult } from "@/lib/programme-budget";

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
  const referenced = budgetEntityWithReferences(entity);
  const tags = new Map(
    (taggedEntities.find((item) => item.id === entity.id)?.results ?? []).map(
      (result) => [result.id, result],
    ),
  );
  const withMetadata = (result: BudgetResult & { referenceId?: string }) => ({
    ...result,
    cardMetadata: tags.get(result.referenceId ?? "")?.cardMetadata ?? {
      entity: { name: entity.name, code: entity.code },
    },
  });
  const sections = (contents: BudgetContent[]) =>
    contents.map((section) => ({
      ...section,
      performance: section.performance.map(withMetadata),
      planned: section.planned.map(withMetadata),
    }));
  return Response.json({
    entity: {
      ...referenced,
      overview: sections(referenced.overview),
      subprogrammes: referenced.subprogrammes.map((programme) => ({
        ...programme,
        sections: sections(programme.sections),
      })),
    },
    edition: budgetEdition,
  });
}
