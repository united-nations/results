"use client";

import { useState } from "react";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import { ResultsExpander } from "@/components/ResultsExpander";
import type { SearchableBudgetResult } from "@/lib/budget-result-index";
import { useResultSearch } from "@/hooks/useResultSearch";

export function ResultMatchList({
  entries,
  edition,
  showOrganization = true,
  pageSize = 12,
}: {
  entries: SearchableBudgetResult[];
  edition: number;
  showOrganization?: boolean;
  pageSize?: number;
}) {
  const [limit, setLimit] = useState(pageSize);
  const nextCount = Math.min(pageSize, entries.length - limit);
  return (
    <>
      <ul className="divide-y">
        {entries.slice(0, limit).map((entry) => {
          const resultType =
            entry.kind === "planned"
              ? "planned result"
              : "programme performance";
          const status = `${entry.year} ${resultType}`;
          return (
            <li key={entry.id}>
              <BudgetResultPreview
                summary={entry}
                edition={edition}
                eyebrow={status}
                supportingText={[
                  showOrganization ? entry.organization : undefined,
                  entry.subprogramme,
                  status,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </li>
          );
        })}
      </ul>
      {nextCount > 0 && (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setLimit(limit + nextCount)}
        >
          Show {nextCount} more {nextCount === 1 ? "result" : "results"}
        </Button>
      )}
    </>
  );
}

export function ResultSearchFeedback({
  status,
  retry,
}: Pick<ReturnType<typeof useResultSearch>, "status" | "retry">) {
  if (status === "error")
    return (
      <div className="mt-6">
        <p className={typography.meta} role="status">
          Search could not be loaded.
        </p>
        <Button type="button" variant="link" size="sm" onClick={retry}>
          Retry search
        </Button>
      </div>
    );
  return status === "loading" ? (
    <p className={`${typography.meta} mt-6`} role="status">
      Loading result search…
    </p>
  ) : null;
}

export function ResultSearchMatches({
  query,
  edition,
}: {
  query: string;
  edition: number;
}) {
  const search = useResultSearch(query);
  const { matches, status } = search;
  if (status !== "ready") return <ResultSearchFeedback {...search} />;
  if (!matches.length)
    return (
      <p className={`${typography.meta} mt-6`} role="status">
        No programme budget results match your search.
      </p>
    );

  return (
    <section className="mt-6">
      <p role="status" className="sr-only">
        {matches.length} matching {matches.length === 1 ? "result" : "results"}
      </p>
      <ResultsExpander
        title="Matching programme budget results"
        headingLevel={2}
        count={matches.length}
        defaultOpen
      >
        <ResultMatchList key={query} entries={matches} edition={edition} />
      </ResultsExpander>
    </section>
  );
}
