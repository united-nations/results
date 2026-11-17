import { indexedBudgetResults } from "@/lib/budget-result-index";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [...indexedBudgetResults.keys()].map((entity) => ({ entity }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const results = indexedBudgetResults.get(entity);
  return results
    ? Response.json(
        Object.fromEntries(
          results.map(({ reference, result }) => [reference.id, result]),
        ),
      )
    : new Response(null, { status: 404 });
}
