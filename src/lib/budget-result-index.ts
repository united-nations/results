import { createHash } from "node:crypto";
import { budgetEntities, type BudgetResultContext } from "./programme-budget";

export type BudgetResultReference = {
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
