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

const peaceAndSecurity = "Maintenance of international peace and security";
const politicalMissionClusters = new Map([
  ["A/81/6 (Sect. 3)/Add.2", "Envoys, advisers and representatives"],
  ["A/81/6 (Sect. 3)/Add.3", "Sanctions monitoring and other mechanisms"],
  ["A/81/6 (Sect. 3)/Add.4", "Regional offices and political missions"],
]);

function directoryEntity(entity: BudgetEntity) {
  return {
    name: entity.name,
    code: entity.code,
    href: withBasePath(entityHref(entity.id)),
  };
}

function directoryGroup(name: string, entities: BudgetEntity[]) {
  if (name !== peaceAndSecurity) {
    return { name, entities: entities.map(directoryEntity) };
  }

  const byCluster = Map.groupBy(entities, (entity) => {
    const symbol =
      entity.overview[0]?.symbol ??
      entity.subprogrammes[0]?.sections[0]?.symbol;
    return symbol ? politicalMissionClusters.get(symbol) : undefined;
  });
  return {
    name,
    entities: (byCluster.get(undefined) ?? []).map(directoryEntity),
    clusters: [...politicalMissionClusters.values()].map((name) => ({
      name,
      entities: (byCluster.get(name) ?? []).map(directoryEntity),
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
