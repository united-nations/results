import { SecretariatPage } from "@/components/SecretariatPage";
import { ResultsOverview } from "@/components/ResultsOverview";
import { indexedBudgetResults } from "@/lib/budget-result-index";
import { priorityAreaColors } from "@/lib/priority-area-colors";
import { formatBudgetHeading, formatBudgetText } from "@/lib/budget-text";
import { resultThumbnail } from "@/lib/result-thumbnail";
import locations from "../../data/result-locations.json";
import { normalizeSearchText } from "@/lib/search-text";
import { displayLocationCodes } from "@/lib/result-location-coverage";
import {
  globalLocation,
  unclassified,
  type ExplorerOptions,
} from "@/lib/result-explorer";
import { beneficiaryColors } from "@/lib/beneficiary-colors";
import { taggedEntities } from "@/lib/tagged-budget-results";
import {
  type BudgetContent,
  budgetEntities,
  budgetSections,
  budgetEdition,
} from "@/lib/programme-budget";

function objectiveSummary(sections: BudgetContent[]) {
  return formatBudgetText([
    ...new Set(sections.flatMap((section) => section.objectives)),
  ])
    .map((block) =>
      block.kind === "list"
        ? block.items
            .map((item) => [item.text, ...item.children].join(" "))
            .join(" ")
        : block.text,
    )
    .join(" ");
}

export function SecretariatOverview({
  initialGrouping = "priority",
}: {
  initialGrouping?: "priority" | "beneficiary";
}) {
  const tagsByResult = new Map(
    taggedEntities.flatMap((entity) =>
      entity.results.map((result) => [result.id, result] as const),
    ),
  );
  const priorities = Object.keys(priorityAreaColors);
  const entityPriorities = new Map(
    budgetEntities.map((entity) => [entity.id, entity.mainPriority ?? "Other"]),
  );
  const sectionsById = new Map(
    budgetSections.map((section) => [section.section, section]),
  );
  const results = [...indexedBudgetResults.values()]
    .flat()
    .map(({ reference, organization, result, location }) => {
      const tag = tagsByResult.get(reference.id);
      const beneficiaries = tag?.beneficiaries.map(formatBudgetHeading) ?? [];
      const section = sectionsById.get(location.section);
      const codes =
        tag?.locations === "global"
          ? ("global" as const)
          : tag?.locations
            ? displayLocationCodes(tag.locations)
            : null;
      const budgetKeys = [
        ...(section ? [`part:${section.part.number}`] : []),
        `section:${location.section}`,
        `entity:${reference.entity}`,
        ...(reference.context.subprogramme
          ? [
              `programme:${reference.entity}:${reference.context.subprogramme.id}`,
            ]
          : []),
        ...(location.component
          ? [
              `component:${reference.entity}:${location.subprogrammeId ?? "entity"}:${location.component}`,
            ]
          : []),
      ];
      return {
        id: reference.id,
        reference,
        beneficiaries,
        locations: codes,
        budgetKeys,
        searchText: normalizeSearchText(
          [
            reference.title,
            organization,
            reference.context.subprogramme?.name,
            reference.context.subprogramme
              ? `Subprogramme ${reference.context.subprogramme.number}`
              : "",
            entityPriorities.get(reference.entity),
            location.component,
            section?.title,
            section?.part.title,
            ...beneficiaries,
            ...(codes === "global"
              ? ["Global"]
              : (codes ?? []).map(
                  (code) =>
                    (locations as Record<string, { name: string }>)[code]
                      ?.name ?? code,
                )),
            result.narrative,
            ...result.measures.flatMap((measure) => [
              measure.label,
              measure.value,
            ]),
            ...result.figures.flatMap((figure) => [
              figure.title,
              figure.subtitle,
              ...figure.series.map((series) => series.name),
            ]),
          ]
            .filter(Boolean)
            .join(" "),
        ),

        title: formatBudgetHeading(reference.title),
        organization,
        thumbnail: resultThumbnail(result, budgetEdition),
        priority: entityPriorities.get(reference.entity) ?? "Other",
      };
    })
    .sort(
      (a, b) =>
        (priorities.indexOf(a.priority) < 0
          ? priorities.length
          : priorities.indexOf(a.priority)) -
        (priorities.indexOf(b.priority) < 0
          ? priorities.length
          : priorities.indexOf(b.priority)),
    );

  const budgetOptions = new Map<string, string>();
  const budgetParents = new Map<string, string>();
  const budgetTreeLabels = new Map<string, string>();
  for (const section of budgetSections) {
    const rows = [...indexedBudgetResults.values()]
      .flat()
      .filter((row) => row.location.section === section.section);
    if (!rows.length) continue;
    budgetOptions.set(
      `part:${section.part.number}`,
      `Part ${section.part.number} · ${section.part.title}`,
    );
    budgetOptions.set(
      `section:${section.section}`,
      `Section ${section.section} · ${section.title}`,
    );
    budgetParents.set(
      `section:${section.section}`,
      `part:${section.part.number}`,
    );
    for (const row of rows) {
      const entity = row.reference.context.entity;
      budgetOptions.set(
        `entity:${entity.id}`,
        `${entity.code && entity.code !== entity.name ? `${entity.code} · ` : ""}${entity.name}`,
      );
      budgetParents.set(`entity:${entity.id}`, `section:${section.section}`);
      const programme = row.reference.context.subprogramme;
      if (programme) {
        budgetParents.set(
          `programme:${entity.id}:${programme.id}`,
          `entity:${entity.id}`,
        );
        budgetTreeLabels.set(
          `programme:${entity.id}:${programme.id}`,
          `Subprogramme ${programme.number} · ${programme.name}`,
        );
        budgetOptions.set(
          `programme:${entity.id}:${programme.id}`,
          `${entity.code ?? entity.name} / Subprogramme ${programme.number} · ${programme.name}`,
        );
      }
      if (row.location.component) {
        const componentKey = `component:${entity.id}:${row.location.subprogrammeId ?? "entity"}:${row.location.component}`;
        budgetParents.set(
          componentKey,
          programme
            ? `programme:${entity.id}:${programme.id}`
            : `entity:${entity.id}`,
        );
        budgetTreeLabels.set(componentKey, row.location.component);
        budgetOptions.set(
          `component:${entity.id}:${row.location.subprogrammeId ?? "entity"}:${row.location.component}`,
          `${entity.code ?? entity.name} / ${row.location.component}`,
        );
      }
    }
  }
  const locationCodes = [
    ...new Set(
      results.flatMap((result) =>
        Array.isArray(result.locations) ? result.locations : [],
      ),
    ),
  ];
  const options: ExplorerOptions = {
    priority: [...new Set(results.map((result) => result.priority))].map(
      (value) => ({ value, label: value }),
    ),
    beneficiary: Object.keys(beneficiaryColors)
      .filter((value) => value !== "Unclassified")
      .map((value) => ({ value, label: value }))
      .concat({ value: unclassified, label: "Unclassified" }),
    location: [
      { value: globalLocation, label: "Global coverage" },
      ...locationCodes
        .map((value) => ({
          value,
          label:
            (locations as Record<string, { name: string }>)[value]?.name ??
            value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      { value: unclassified, label: "No location tags" },
    ],
    budget: [...budgetOptions].map(([value, label]) => ({
      value,
      label,
      parent: budgetParents.get(value),
      treeLabel: budgetTreeLabels.get(value),
    })),
  };

  return (
    <SecretariatPage>
      <ResultsOverview
        results={results}
        filterOptions={options}
        initialGrouping={initialGrouping}
        edition={budgetEdition}
        entityObjectives={Object.fromEntries(
          budgetEntities.map((entity) => [
            entity.id,
            objectiveSummary(entity.overview),
          ]),
        )}
        subprogrammeObjectives={Object.fromEntries(
          budgetEntities.flatMap((entity) =>
            entity.subprogrammes.map((programme) => [
              `${entity.id}:${programme.id}`,
              objectiveSummary(programme.sections),
            ]),
          ),
        )}
      />
    </SecretariatPage>
  );
}
