import { SecretariatPage } from "@/components/SecretariatPage";
import { ResultsOverview } from "@/components/ResultsOverview";
import { indexedBudgetResults } from "@/lib/budget-result-index";
import { priorityAreaColors } from "@/lib/priority-area-colors";
import { formatBudgetHeading, formatBudgetText } from "@/lib/budget-text";
import { resultThumbnail } from "@/lib/result-thumbnail";
import { taggedEntities } from "@/lib/tagged-budget-results";
import {
  type BudgetContent,
  budgetEntities,
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
  const beneficiariesByResult = new Map(
    taggedEntities.flatMap((entity) =>
      entity.results.map(
        (result) => [result.id, result.beneficiaries] as const,
      ),
    ),
  );
  const priorities = Object.keys(priorityAreaColors);
  const entityPriorities = new Map(
    budgetEntities.map((entity) => [entity.id, entity.mainPriority ?? "Other"]),
  );
  const results = [...indexedBudgetResults.values()]
    .flat()
    .map(({ reference, organization, result }) => {
      return {
        id: reference.id,
        reference,
        beneficiaries: beneficiariesByResult.get(reference.id) ?? [],
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

  return (
    <SecretariatPage>
      <ResultsOverview
        results={results}
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
