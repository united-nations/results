import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BudgetEntityPage } from "@/components/BudgetEntityPage";
import { budgetEntities, findBudgetEntity } from "@/lib/programme-budget";

type Params = { entity: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return budgetEntities.map(({ id }) => ({ entity: id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  return { title: findBudgetEntity((await params).entity)?.name };
}

export default async function EntityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const entity = findBudgetEntity((await params).entity);
  if (!entity) notFound();
  return <BudgetEntityPage entity={entity} />;
}
