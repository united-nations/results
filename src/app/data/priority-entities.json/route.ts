import { budgetEntities } from "@/lib/programme-budget";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    budgetEntities.map(({ id, name, mainPriority }) => ({
      id,
      name,
      priority: mainPriority,
    })),
  );
}
