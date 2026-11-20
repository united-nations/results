import tags from "../../data/oict-result-tags-2027.json";
import {
  indexedBudgetResults,
  type BudgetResultReference,
} from "./budget-result-index";
import { budgetEntities } from "./programme-budget";

export type TaggedResultSummary = BudgetResultReference & {
  beneficiaries: string[];
  locations: string[] | "global";
};

export type TaggedEntity = {
  id: string;
  code: string | null;
  name: string;
  results: TaggedResultSummary[];
};

const taggedByEntity = Map.groupBy(tags, (tag) => tag.entity);
export const taggedEntities: TaggedEntity[] = [];

for (const { id, code, name } of budgetEntities) {
  const entityTags = taggedByEntity.get(id);
  if (!entityTags) continue;
  const entries = indexedBudgetResults.get(id) ?? [];
  const results = entityTags.map((tag): TaggedResultSummary => {
    const matches = entries.filter(
      ({ kind, symbol, result }) =>
        kind === tag.kind &&
        symbol === tag.symbol &&
        result.title === tag.title,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Cannot resolve OICT result ${tag.id}. Run scripts/match-oict-results.mjs after updating the budget.`,
      );
    }
    return {
      ...matches[0].reference,
      beneficiaries: tag.beneficiaries,
      locations:
        tag.locations === "global" ? "global" : (tag.locations as string[]),
      cardMetadata: {
        entity: { name, code },
        beneficiaries: tag.beneficiaries,
        locations:
          tag.locations === "global" ? "global" : (tag.locations as string[]),
      },
    };
  });
  taggedEntities.push({ id, code, name, results });
}
