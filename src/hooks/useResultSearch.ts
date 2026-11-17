"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchableBudgetResult } from "@/lib/budget-result-index";
import { resultInBudgetScope, type BudgetScope } from "@/lib/budget-scope";
import { withBasePath } from "@/lib/paths";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";

export function useResultSearch(query: string, scope?: BudgetScope) {
  const [index, setIndex] = useState<SearchableBudgetResult[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = Boolean(query.trim() || scope);

  useEffect(() => {
    if (!active || index) return;
    const request = new AbortController();
    // Version 2 adds the location metadata needed for scoped searches.
    fetch(withBasePath("/data/results/search.json?v=2"), {
      signal: request.signal,
    })
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
    if (!index || (!terms.length && !scope)) return [];
    const titleMatches: SearchableBudgetResult[] = [];
    const otherMatches: SearchableBudgetResult[] = [];
    for (const entry of index) {
      if (scope && !resultInBudgetScope(entry.location, scope)) continue;
      if (!terms.every((term) => entry.text.includes(term))) continue;
      const title = normalizeSearchText(entry.title);
      (terms.every((term) => title.includes(term))
        ? titleMatches
        : otherMatches
      ).push(entry);
    }
    return [...titleMatches, ...otherMatches];
  }, [index, query, scope]);

  const status = !active
    ? "idle"
    : failed
      ? "error"
      : index
        ? "ready"
        : "loading";
  return {
    matches,
    status,
    retry: () => {
      setFailed(false);
      setAttempt((current) => current + 1);
    },
  } as const;
}
