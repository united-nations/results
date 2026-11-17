import {
  budgetEntities,
  budgetSections,
  type BudgetContent,
} from "./programme-budget";
import type { BudgetHierarchyNode, BudgetScope } from "./budget-scope";

function componentNodes(contents: BudgetContent[], scope: BudgetScope) {
  const names = new Set(contents.flatMap(({ component }) => component ?? []));
  return [...names].map((component): BudgetHierarchyNode => ({
    id: JSON.stringify([
      ...scope.sections,
      scope.entity,
      scope.subprogrammeId,
      component,
    ]),
    label: /^Component\b/i.test(component)
      ? component
      : `Component · ${component}`,
    entityIds: scope.entity ? [scope.entity] : [],
    scope: { ...scope, component },
    children: [],
  }));
}

function entitiesInSection(section: string): BudgetHierarchyNode[] {
  return budgetEntities.flatMap((entity) => {
    const overview = entity.overview.filter(
      (content) => content.section === section,
    );
    const scope = { sections: [section], entity: entity.id };
    const subprogrammes = entity.subprogrammes.flatMap(
      (programme): BudgetHierarchyNode[] => {
        const contents = programme.sections.filter(
          (content) => content.section === section,
        );
        if (!contents.length) return [];
        const subprogrammeScope = { ...scope, subprogrammeId: programme.id };
        return [
          {
            id: JSON.stringify([section, entity.id, programme.id]),
            label: `Subprogramme ${programme.number} · ${programme.name}`,
            entityIds: [entity.id],
            scope: subprogrammeScope,
            children: componentNodes(contents, subprogrammeScope),
          },
        ];
      },
    );
    if (!overview.length && !subprogrammes.length) return [];
    return [
      {
        id: JSON.stringify([section, entity.id]),
        label:
          entity.code && entity.code !== entity.name
            ? `${entity.code} · ${entity.name}`
            : entity.name,
        entityIds: [entity.id],
        scope,
        children: [...componentNodes(overview, scope), ...subprogrammes],
      },
    ];
  });
}

export const budgetHierarchy: BudgetHierarchyNode[] = [
  ...Map.groupBy(
    budgetSections.toSorted((a, b) =>
      a.section.localeCompare(b.section, "en", { numeric: true }),
    ),
    (section) => section.part.number,
  ).values(),
].map((sections) => {
  const { part } = sections[0];
  const children = sections.map(({ section, title, programme }) => {
    const entities = entitiesInSection(section);
    const sameTitle = programme?.title.toLowerCase() === title.toLowerCase();
    const label = programme
      ? `Programme ${programme.number} · Section ${section} — ${sameTitle ? title : `${programme.title} / ${title}`}`
      : `Section ${section} — ${title}`;
    return {
      id: section,
      label,
      entityIds: entities.flatMap((entity) => entity.entityIds),
      scope: { sections: [section] },
      children: entities,
    };
  });
  return {
    id: `part:${part.number}`,
    label: `Part ${part.number} — ${part.title}`,
    entityIds: [...new Set(children.flatMap((section) => section.entityIds))],
    scope: { sections: sections.map((section) => section.section) },
    children,
  };
});
