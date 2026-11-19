// Groups and ordering use the 2026 Secretary-General report's “Our team” lists.
// Standalone entities always precede labelled groups, overriding report order.
// These groups do not change entities' priority-area assignments.
// Political-mission memberships follow A/81/6 (Sect. 3)/Add.2, Add.3 and Add.4.
type Slot = { key: string; label?: string; ids: string[] };
const individual = (id: string): Slot => ({ key: id, ids: [id] });
const layouts: Record<string, Slot[]> = {
  "Maintenance of international peace and security": [
    individual("dppa"),
    individual("dpo"),
    {
      key: "peacekeeping",
      label: "Peacekeeping missions",
      ids: ["unmogip", "untso"],
    },
    {
      key: "envoys",
      label: "Special political missions · Envoys and advisers",
      ids: [
        "gom-cyprus",
        "ojsrs",
        "osesg-gl",
        "osesg-horn",
        "osesg-myanmar",
        "osesg-scres1559",
        "osesg-yemen",
        "pesg-sudan",
        "pesg-ws",
        "unrgid",
      ],
    },
    {
      key: "sanctions",
      label:
        "Special political missions · Sanctions monitoring and other mechanisms",
      ids: [
        "asm-aqmt",
        "cted",
        "focal-point",
        "goe-drc",
        "ombud-res1904",
        "poe-car",
        "poe-dprk",
        "poe-haiti",
        "poe-iran",
        "poe-libya",
        "poe-s-sudan",
        "poe-somalia",
        "poe-sudan",
        "poe-yemen",
        "sc-res1540",
      ],
    },
    {
      key: "regional-missions",
      label: "Special political missions · Regional offices and other missions",
      ids: [
        "binuh",
        "cnmc",
        "unama",
        "unoca",
        "unowas",
        "unrcca",
        "unscol",
        "unsmil",
        "unvmc",
      ],
    },
    {
      key: "special-representatives",
      label: "Special Representatives",
      ids: ["osrsg-vac", "osrsg-caac", "osrsg-svc"],
    },
    individual("sasg-pgenocide"),
  ],
  "Promotion of sustained economic growth and sustainable development": [
    individual("desa"),
    individual("rcs"),
    individual("unctad"),
    individual("un-ohrlls"),
    {
      key: "regional-commissions",
      label: "Regional commissions",
      ids: ["eca", "ece", "eclac", "escap", "escwa"],
    },
    individual("un-women"),
    individual("un-habitat"),
    individual("unep"),
    individual("oosa"),
  ],
  "Development of Africa": [individual("osaa")],
  "Promotion and protection of human rights": [individual("ohchr")],
  "Effective coordination of humanitarian assistance efforts": [
    individual("ocha"),
    individual("undrr"),
  ],
  "Promotion of international justice and law": [individual("ola")],
  Disarmament: [individual("oda")],
  "Drug control, crime prevention and combating terrorism": [
    individual("unodc"),
    individual("oct"),
  ],
  "Effective functioning of the organization": [
    individual("dgacm"),
    individual("dgc"),
    individual("dmspc"),
    individual("dos"),
    individual("dss"),
    individual("oios"),
    {
      key: "offices-away",
      label: "United Nations offices at Geneva, Nairobi and Vienna",
      ids: ["unog", "unon", "unov"],
    },
    individual("eo"),
    individual("osc-sea"),
    individual("ovra"),
  ],
};

export type EntityPresentationGroup<T> = {
  key: string;
  label?: string;
  entities: T[];
};

export function groupEntities<T extends { id: string; name: string }>(
  priority: string,
  entities: T[],
): EntityPresentationGroup<T>[] {
  const remaining = new Map(entities.map((entity) => [entity.id, entity]));
  const slots = layouts[priority] ?? [];
  const groups: EntityPresentationGroup<T>[] = [];
  const take = (ids: string[]) =>
    ids.flatMap((id) => {
      const entity = remaining.get(id);
      remaining.delete(id);
      return entity ? [entity] : [];
    });
  // All standalone entities precede every labelled group, including entities
  // absent from the report. Preserve report order among named standalones.
  const standalone = slots
    .filter((slot) => !slot.label)
    .flatMap((slot) => take(slot.ids));
  const groupedIds = new Set(
    slots.filter((slot) => slot.label).flatMap((slot) => slot.ids),
  );
  const unlisted = [...remaining.values()]
    .filter((entity) => !groupedIds.has(entity.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  standalone.push(...take(unlisted.map((entity) => entity.id)));
  if (standalone.length)
    groups.push({ key: "individuals", entities: standalone });
  for (const slot of slots.filter((slot) => slot.label)) {
    const members = take(slot.ids).sort((a, b) => a.name.localeCompare(b.name));
    if (members.length)
      groups.push({ key: slot.key, label: slot.label, entities: members });
  }
  return groups;
}
