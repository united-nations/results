import type { Metadata } from "next";
import { PriorityDirectory } from "@/components/PriorityDirectory";
import { SecretariatPage } from "@/components/SecretariatPage";
import { budgetHierarchy } from "@/lib/budget-hierarchy";
import { getEntityDescription } from "@/lib/entity-descriptions";
import { withBasePath } from "@/lib/paths";
import {
  type BudgetEntity,
  budgetEntities,
  budgetEdition,
  entityHref,
} from "@/lib/programme-budget";

export const metadata: Metadata = { title: "UN Secretariat Results" };

const peaceAndSecurity = "Maintenance of international peace and security";
// The order and display labels follow the contents of the 2025 annual report (A/80/1).
const annualReportPriorities = [
  [
    "Promotion of sustained economic growth and sustainable development",
    "Forging pathways for sustainable development",
  ],
  [peaceAndSecurity, "Fostering peace and security"],
  [
    "Development of Africa",
    "Propelling African growth",
    "Development in Africa",
  ],
  ["Promotion and protection of human rights", "Upholding human rights"],
  [
    "Effective coordination of humanitarian assistance efforts",
    "Securing humanitarian assistance",
    "Effective coordination of humanitarian assistance",
  ],
  [
    "Promotion of international justice and law",
    "Advancing justice and international law",
    "Promotion of justice and international law",
  ],
  [
    "Disarmament",
    "Championing disarmament",
    "Advancement of disarmament and non-proliferation",
  ],
  [
    "Drug control, crime prevention and combating terrorism",
    "Combating drugs, crime and terrorism",
  ],
  [
    "Effective functioning of the organization",
    "Enhancing our operations",
    "Effective functioning of the Organization",
  ],
] as const;

const politicalMissionClusters = new Map([
  ["A/81/6 (Sect. 3)/Add.2", "Envoys, advisers and representatives"],
  ["A/81/6 (Sect. 3)/Add.3", "Sanctions monitoring and other mechanisms"],
  ["A/81/6 (Sect. 3)/Add.4", "Regional offices and political missions"],
]);
const protectionSubgroup =
  "Special representatives and coordinators for protection";
const protectionOfficeIds = new Set([
  "osc-sea",
  "osrsg-caac",
  "osrsg-svc",
  "osrsg-vac",
]);

function directoryEntity(entity: BudgetEntity) {
  return {
    id: entity.id,
    name: entity.name,
    code: entity.code,
    href: withBasePath(entityHref(entity.id)),
    description: getEntityDescription(entity.id).text,
  };
}

function directoryGroup(name: string, entities: BudgetEntity[]) {
  if (name !== peaceAndSecurity) {
    return { name, entities: entities.map(directoryEntity) };
  }

  const byCluster = Map.groupBy(entities, (entity) => {
    if (protectionOfficeIds.has(entity.id)) return protectionSubgroup;

    const symbol =
      entity.overview[0]?.symbol ??
      entity.subprogrammes[0]?.sections[0]?.symbol;
    return symbol ? politicalMissionClusters.get(symbol) : undefined;
  });
  return {
    name,
    entities: (byCluster.get(undefined) ?? []).map(directoryEntity),
    clusters: [...politicalMissionClusters.values(), protectionSubgroup].map(
      (name) => ({
        name,
        entities: (byCluster.get(name) ?? []).map(directoryEntity),
      }),
    ),
  };
}

const entities = budgetEntities.filter((entity) => entity.kind === "entity");
const directory = [
  ...annualReportPriorities.map(
    ([priority, headline, officialName = priority]) => ({
      ...directoryGroup(
        priority,
        entities.filter((entity) => entity.mainPriority === priority),
      ),
      headline,
      officialName,
    }),
  ),
  directoryGroup(
    "Other",
    budgetEntities.filter(
      (entity) => entity.kind === "budget-unit" || entity.mainPriority === null,
    ),
  ),
];

export default function UNSecretariat() {
  return (
    <SecretariatPage activeHref="/">
      <PriorityDirectory
        groups={directory}
        budgetHierarchy={budgetHierarchy}
        edition={budgetEdition}
      />
    </SecretariatPage>
  );
}
