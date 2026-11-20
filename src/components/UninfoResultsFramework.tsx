"use client";

import { useState } from "react";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
import { FinancialPanelBar } from "@un-eosg/ui/components/financial-panel-parts";
import { typography } from "@un-eosg/ui/typography";
import { formatBudget } from "@un-eosg/ui/format-budget";
import type { UninfoFrameworkNode, UninfoResources } from "@/lib/uninfo";

const levels = ["Strategic priority", "Outcome", "Output"];

function displayTitle(text: string) {
  if (text !== text.toLocaleUpperCase() || !/\p{L}/u.test(text)) return text;
  return text
    .toLocaleLowerCase()
    .replace(
      /\p{L}[\p{L}\p{M}]*/gu,
      (word) => word[0].toLocaleUpperCase() + word.slice(1),
    )
    .replace(/\b(un|sdg|sdgs|undp|unicef|who|fao|unesco)\b/gi, (word) =>
      word.toUpperCase(),
    );
}

function resourcesFor(node: UninfoFrameworkNode): UninfoResources {
  const value = (metric: keyof UninfoResources) =>
    node.reported_metrics
      ? node.reported_metrics.includes(metric)
        ? node[metric]
        : null
      : node.has_financial_data === false
        ? null
        : node[metric];
  return {
    required: value("required"),
    available: value("available"),
    spent: value("spent"),
  };
}

function FrameworkBranch({
  node,
  maximum,
  depth = 0,
}: {
  node: UninfoFrameworkNode;
  maximum: number;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const resources = resourcesFor(node);
  const title = displayTitle(node.name);
  const type = levels[node.level ?? depth] ?? "Framework item";
  return (
    <FinancialBreakdownRow
      label={title}
      badge={
        node.code ? (
          <span
            className={`${typography.label} shrink-0 rounded-full bg-un-blue px-1.5 py-0.5 text-un-white`}
          >
            {node.code}
          </span>
        ) : undefined
      }
      value={resources.spent == null ? "—" : formatBudget(resources.spent)}
      bar={
        <FinancialPanelBar
          percent={Math.max(0, ((resources.spent ?? 0) / maximum) * 100)}
          color="var(--color-un-blue)"
        />
      }
      tooltip={
        <div className="space-y-2">
          <p className={typography.caption}>{type}</p>
          <p className={typography.body}>{title}</p>
          <p className={typography.body}>
            Expenditure:{" "}
            {resources.spent == null
              ? "Not reported"
              : formatBudget(resources.spent)}
          </p>
        </div>
      }
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <div className="ms-4 mb-4 border-s ps-4">
        <p className={`${typography.caption} mt-3`}>{type}</p>
        <p className={`${typography.body} mt-1 font-medium`}>{title}</p>
        {node.description && (
          <p className={`${typography.body} mt-3 whitespace-pre-line`}>
            {node.description}
          </p>
        )}
        {node.children?.length ? (
          <ul className="mt-4 space-y-1">
            {node.children.map((child) => (
              <FrameworkBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                maximum={Math.max(
                  1,
                  ...node.children!.map(
                    (item) => resourcesFor(item).spent ?? 0,
                  ),
                )}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </FinancialBreakdownRow>
  );
}

export function UninfoResultsFramework({
  framework,
}: {
  framework: readonly UninfoFrameworkNode[];
}) {
  const maximum = Math.max(
    1,
    ...framework.map((node) => resourcesFor(node).spent ?? 0),
  );
  return (
    <ul className="space-y-2">
      {framework.map((node) => (
        <FrameworkBranch key={node.id} node={node} maximum={maximum} />
      ))}
    </ul>
  );
}
