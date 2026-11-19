import type { ReactNode } from "react";
import { typography } from "@un-eosg/ui/typography";
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
          <Heading
            className={`${typography.body} bg-muted px-3 py-2 font-medium`}
          >
            {entity.code && (
              <>
                <span className="me-1 text-un-blue-text">
                  {entity.code}
                </span>{" "}
              </>
            )}
            {entity.name !== entity.code && entity.name}
          </Heading>
          <ul className="grid gap-3 p-3 sm:grid-cols-2">
            {results.map((summary) => (
              <li key={summary.id} className="flex min-w-0 flex-col gap-2">
                <div className="min-h-0 flex-1">
                  <BudgetResultPreview summary={summary} edition={edition} />
                </div>
                {renderAfterResult?.(summary)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
