"use client";

import { useEffect, useState, type ReactNode } from "react";
import { typography } from "@un-eosg/ui/typography";
import { BudgetResultDetails } from "@/components/BudgetResultDetails";
import { ResultSidecar } from "@/components/ResultSidecar";
import { withBasePath } from "@/lib/paths";
import type { BudgetResult } from "@/lib/programme-budget";
import type { BudgetResultReference } from "@/lib/budget-result-index";

function Details({
  summary,
  edition,
}: {
  summary: BudgetResultReference;
  edition: number;
}) {
  const [result, setResult] = useState<BudgetResult>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const request = new AbortController();
    fetch(withBasePath(`/data/results/${summary.entity}/results.json`), {
      signal: request.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load result");
        return response.json() as Promise<Record<string, BudgetResult>>;
      })
      .then((results) => {
        const match = results[summary.id];
        if (!match) throw new Error("Result is missing");
        if (!request.signal.aborted) setResult(match);
      })
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, [summary.entity, summary.id]);

  if (failed || !result) {
    return (
      <p className={typography.meta} role="status">
        {failed
          ? "The result details could not be loaded."
          : "Loading result details…"}
      </p>
    );
  }
  return (
    <BudgetResultDetails
      result={result}
      source={summary.source}
      edition={edition}
    />
  );
}

export function BudgetResultPreview({
  summary,
  edition,
  supportingText,
  eyebrow,
  children,
}: {
  summary: BudgetResultReference;
  edition: number;
  supportingText?: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <ResultSidecar
        title={summary.title}
        source={summary.source}
        supportingText={supportingText}
        eyebrow={eyebrow}
        context={summary.context}
      >
        <Details summary={summary} edition={edition} />
      </ResultSidecar>
      {children}
    </>
  );
}
