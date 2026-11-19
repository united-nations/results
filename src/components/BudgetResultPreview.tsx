"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
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
  trigger,
  renderTrigger,
  focusGroup,
}: {
  summary: BudgetResultReference;
  edition: number;
  supportingText?: string;
  eyebrow?: string;
  children?: ReactNode;
  trigger?: ReactElement;
  renderTrigger?: (trigger: ReactElement) => ReactNode;
  focusGroup?: string;
}) {
  return (
    <>
      <ResultSidecar
        resultId={summary.id}
        focusGroup={focusGroup}
        title={summary.title}
        source={summary.source}
        supportingText={supportingText}
        eyebrow={eyebrow}
        context={summary.context}
        trigger={trigger}
        renderTrigger={renderTrigger}
      >
        <Details summary={summary} edition={edition} />
      </ResultSidecar>
      {children}
    </>
  );
}
