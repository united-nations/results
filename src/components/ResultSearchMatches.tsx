"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import { ResultsExpander } from "@/components/ResultsExpander";
import type { SearchableBudgetResult } from "@/lib/budget-result-index";
import { withBasePath } from "@/lib/paths";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";

const pageSize = 12;

function MatchList({
  entries,
  edition,
}: {
  entries: SearchableBudgetResult[];
  edition: number;
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
                supportingText={[entry.organization, entry.subprogramme, status]
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

export function ResultSearchMatches({
  query,
  edition,
  defaultOpen = true,
}: {
  query: string;
  edition: number;
  defaultOpen?: boolean;
}) {
  const [index, setIndex] = useState<SearchableBudgetResult[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = Boolean(query.trim());

  useEffect(() => {
    if (!active || index) return;
    const request = new AbortController();
    fetch(withBasePath("/data/results/search.json"), { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the results index");
        return response.json() as Promise<SearchableBudgetResult[]>;
      })
      .then((entries) => {
        if (!request.signal.aborted) {
          setIndex(entries);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, [active, index, attempt]);

  const matches = useMemo(() => {
    const terms = searchTerms(query);
    if (!index || !terms.length) return [];
    const titleMatches: SearchableBudgetResult[] = [];
    const otherMatches: SearchableBudgetResult[] = [];
    for (const entry of index) {
      if (!terms.every((term) => entry.text.includes(term))) continue;
      const title = normalizeSearchText(entry.title);
      (terms.every((term) => title.includes(term))
        ? titleMatches
        : otherMatches
      ).push(entry);
    }
    return [...titleMatches, ...otherMatches];
  }, [index, query]);

  if (!active) return null;
  if (failed)
    return (
      <div className="mt-6">
        <p className={typography.meta} role="status">
          Search could not be loaded.
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            setFailed(false);
            setAttempt(attempt + 1);
          }}
        >
          Retry search
        </Button>
      </div>
    );
  if (!index || !matches.length)
    return (
      <p className={`${typography.meta} mt-6`} role="status">
        {index
          ? "No programme budget results match your search."
          : "Loading result search…"}
      </p>
    );

  return (
    <section className="mt-6">
      <p role="status" className="sr-only">
        {matches.length} matching {matches.length === 1 ? "result" : "results"}
      </p>
      <ResultsExpander
        key={String(defaultOpen)}
        title="Matching programme budget results"
        headingLevel={2}
        count={matches.length}
        defaultOpen={defaultOpen}
      >
        <MatchList key={query} entries={matches} edition={edition} />
      </ResultsExpander>
    </section>
  );
}
