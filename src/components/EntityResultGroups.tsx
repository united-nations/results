import type { ReactNode } from "react";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import type {
  TaggedEntity,
  TaggedResultSummary,
} from "@/lib/tagged-budget-results";

export type EntityResults = {
  entity: Pick<TaggedEntity, "id" | "code" | "name">;
  results: TaggedResultSummary[];
};

export function EntityResultGroups({
  groups,
  edition,
  headingLevel,
  renderAfterResult,
}: {
  groups: EntityResults[];
  edition: number;
  headingLevel: 3 | 4;
  renderAfterResult?: (result: TaggedResultSummary) => ReactNode;
}) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  return (
    <div className="my-3 space-y-3 ps-3">
      {groups.map(({ entity, results }) => (
        <section className="border-s-2 border-un-blue-surface" key={entity.id}>
          <Heading className="bg-muted px-3 py-2 text-sm font-medium">
            {entity.code && (
              <span className="me-2 text-un-blue-text">{entity.code}</span>
            )}
            {entity.name}
          </Heading>
          <ul className="divide-y">
            {results.map((summary) => (
              <li key={summary.id}>
                <BudgetResultPreview summary={summary} edition={edition}>
                  {renderAfterResult?.(summary)}
                </BudgetResultPreview>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
