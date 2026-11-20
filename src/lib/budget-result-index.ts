import { createHash } from "node:crypto";
import type { ResultCardMetadata } from "./result-card-metadata";
import {
  budgetEntities,
  type BudgetContent,
  type BudgetEntity,
  type BudgetResultContext,
} from "./programme-budget";

export type BudgetResultReference = {
  cardMetadata?: ResultCardMetadata;
  id: string;
  entity: string;
  title: string;
  source: string;
  context: BudgetResultContext;
};

export const indexedBudgetResults = new Map(
  budgetEntities
    .map(({ id: entity, name, code, overview, subprogrammes }) => {
      const sections = [
        ...overview.map((section) => ({
          section,
          subprogramme: undefined,
          subprogrammeId: undefined,
          subprogrammeNumber: undefined,
        })),
        ...subprogrammes.flatMap((programme) =>
          programme.sections.map((section) => ({
            section,
            subprogramme: programme.name,
            subprogrammeId: programme.id,
            subprogrammeNumber: programme.number,
          })),
        ),
      ];
      const entries = sections.flatMap(
        ({ section, subprogramme, subprogrammeId, subprogrammeNumber }) =>
          (["performance", "planned"] as const).flatMap((kind) =>
            section[kind].map((result) => ({
              reference: {
                id: createHash("sha256")
                  .update(
                    JSON.stringify([
                      entity,
                      subprogrammeId,
                      section.name,
                      section.source,
                      kind,
                      result,
                    ]),
                  )
                  .digest("hex"),
                entity,
                title: result.title || "Performance measures",
                source: section.source,
                context: {
                  entity: { id: entity, name, code },
                  ...(subprogrammeId &&
                  subprogrammeNumber !== undefined &&
                  subprogramme
                    ? {
                        subprogramme: {
                          id: subprogrammeId,
                          number: subprogrammeNumber,
                          name: subprogramme,
                        },
                      }
                    : {}),
                },
              },
              organization: code && code !== name ? `${code} · ${name}` : name,
              subprogramme,
              location: {
                section: section.section,
                entity,
                subprogrammeId,
                component: section.component,
              },
              symbol: section.symbol,
              kind,
              result,
            })),
          ),
      );
      if (
        new Set(entries.map(({ reference }) => reference.id)).size !==
        entries.length
      ) {
        throw new Error(`Duplicate budget result references for ${entity}`);
      }
      return [entity, entries] as const;
    })
    .filter(([, entries]) => entries.length),
);

export function budgetEntityWithReferences(entity: BudgetEntity) {
  const ids = new Map(
    (indexedBudgetResults.get(entity.id) ?? []).map(({ result, reference }) => [
      result,
      reference.id,
    ]),
  );
  const sections = (contents: BudgetContent[]) =>
    contents.map((content) => ({
      ...content,
      performance: content.performance.map((result) => ({
        ...result,
        referenceId: ids.get(result),
      })),
      planned: content.planned.map((result) => ({
        ...result,
        referenceId: ids.get(result),
      })),
    }));
  return {
    ...entity,
    overview: sections(entity.overview),
    subprogrammes: entity.subprogrammes.map((programme) => ({
      ...programme,
      sections: sections(programme.sections),
    })),
  };
}
