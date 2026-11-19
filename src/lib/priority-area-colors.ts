// Matches open.UN.org's secretariatGroupings priorityAreaColor identities
// and secretariat-taxonomies ordering, including its drug-control override.
export const priorityAreaColors: Record<string, string> = {
  "Maintenance of international peace and security": "var(--color-un-blue)",
  "Effective functioning of the organization": "var(--color-faded-jade)",
  "Promotion of sustained economic growth and sustainable development":
    "var(--color-camouflage-green)",
  "Promotion of international justice and law": "#9b8b7a",
  "Promotion and protection of human rights": "var(--color-au-chico)",
  "Effective coordination of humanitarian assistance efforts":
    "var(--color-smoky)",
  Disarmament: "var(--color-shuttle-gray)",
  "Development of Africa": "var(--color-trout)",
  "Drug control, crime prevention and combating terrorism": "#9a6b2f",
};

export function priorityAreaAnchor(name: string) {
  return `priority-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}
