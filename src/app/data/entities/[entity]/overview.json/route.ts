import {
  budgetEntities,
  budgetEdition,
  findBudgetEntity,
} from "@/lib/programme-budget";
import { budgetEntityWithReferences } from "@/lib/budget-result-index";

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
  return Response.json({
    entity: budgetEntityWithReferences(entity),
    edition: budgetEdition,
  });
}
