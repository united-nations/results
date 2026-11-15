import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BudgetEntityPage } from "@/components/BudgetEntityPage";
import { budgetEntities, findBudgetEntity } from "@/lib/programme-budget";

type Params = { entity: string; subprogramme: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return budgetEntities.flatMap((entity) =>
    entity.subprogrammes.map(({ id }) => ({
      entity: entity.id,
      subprogramme: id,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { entity, subprogramme } = await params;
  const owner = findBudgetEntity(entity);
  const unit = owner?.subprogrammes.find(({ id }) => id === subprogramme);
  return {
    title:
      unit && owner ? `${unit.name} | ${owner.code ?? owner.name}` : undefined,
  };
}

export default async function SubprogrammePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { entity, subprogramme } = await params;
  const owner = findBudgetEntity(entity);
  const unit = owner?.subprogrammes.find(({ id }) => id === subprogramme);
  if (!owner || !unit) notFound();
  return <BudgetEntityPage entity={owner} selected={unit} />;
}
