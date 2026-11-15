import type { Metadata } from "next";
import { typography } from "@un-eosg/ui/typography";
import { PriorityDirectory } from "@/components/PriorityDirectory";
import { SiteShell } from "@/components/SiteShell";
import { withBasePath } from "@/lib/paths";
import {
  type BudgetEntity,
  budgetEdition,
  budgetEntities,
  budgetPriorities,
  entityHref,
  priorityYear,
} from "@/lib/programme-budget";

export const metadata: Metadata = { title: "UN Secretariat" };

function directoryGroup(name: string, entities: BudgetEntity[]) {
  return {
    name,
    entities: entities.map((entity) => ({
      name: entity.name,
      code: entity.code,
      href: withBasePath(entityHref(entity.id)),
    })),
  };
}

const entities = budgetEntities.filter((entity) => entity.kind === "entity");
const directory = [
  ...budgetPriorities.map((priority) =>
    directoryGroup(
      priority,
      entities.filter((entity) => entity.priorities.includes(priority)),
    ),
  ),
  directoryGroup(
    "Entities without a mapped priority",
    entities.filter((entity) => !entity.priorities.length),
  ),
  directoryGroup(
    "Other budget units",
    budgetEntities.filter((entity) => entity.kind === "budget-unit"),
  ),
];

export default function UNSecretariat() {
  return (
    <SiteShell>
      <p className={typography.eyebrow}>
        {budgetEdition} proposed programme budget
      </p>
      <h1 className={`${typography.pageTitle} mt-2`}>UN Secretariat</h1>
      <p className={`${typography.prose} mt-4 max-w-2xl`}>
        Explore what each entity plans to achieve and what it reported
        achieving. Priority areas follow Open UN’s {priorityYear} financial
        reporting.
      </p>
      <PriorityDirectory groups={directory} />
    </SiteShell>
  );
}
