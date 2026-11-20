"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { FinancialPanelBreakdownRow } from "@un-eosg/ui/components/financial-panel-parts";
import { formatBudget } from "@un-eosg/ui/format-budget";
import { typography } from "@un-eosg/ui/typography";
import type { UninfoEntityFinance, UninfoResources } from "@/lib/uninfo";

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group/finance border-t py-2">
      <summary
        className={`${typography.body} flex cursor-pointer list-none items-center gap-2 rounded-sm py-1 focus-visible:outline-2 focus-visible:outline-un-blue [&::-webkit-details-marker]:hidden`}
      >
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 shrink-0 group-open/finance:rotate-90"
        />
        {label}
      </summary>
      <div className="mt-3 space-y-3 pb-2">{children}</div>
    </details>
  );
}

export function UninfoFinancialDetails({
  resources,
  entities = [],
}: {
  resources: UninfoResources;
  entities?: readonly UninfoEntityFinance[];
}) {
  const ranked = [...entities].sort(
    (a, b) =>
      (b.spent ?? -Infinity) - (a.spent ?? -Infinity) ||
      a.code.localeCompare(b.code),
  );
  const entityMaximum = Math.max(
    1,
    ...ranked.map((entity) => entity.spent ?? 0),
  );
  const entityTotal = ranked.reduce(
    (sum, entity) => sum + (entity.spent ?? 0),
    0,
  );
  const differsFromReportedTotal =
    resources.spent != null &&
    ranked.some((entity) => entity.spent != null) &&
    Math.abs(entityTotal - resources.spent) > 1;
  const resourceMaximum = Math.max(
    1,
    ...Object.values(resources).map((value) => value ?? 0),
  );
  return (
    <div className="mt-4">
      <Disclosure label="Expenditure by entity">
        {ranked.length ? (
          <>
            {ranked.map((entity) => (
              <FinancialPanelBreakdownRow
                key={entity.id}
                label={<span title={entity.name}>{entity.code}</span>}
                value={entity.spent == null ? "—" : formatBudget(entity.spent)}
                percent={Math.max(
                  0,
                  ((entity.spent ?? 0) / entityMaximum) * 100,
                )}
                color="var(--color-un-blue)"
              />
            ))}
            {ranked.some((entity) => entity.spent == null) && (
              <p className={typography.caption}>— Expenditure not reported.</p>
            )}
            {differsFromReportedTotal && (
              <p className={typography.caption}>
                Entity allocations total {formatBudget(entityTotal)}; the
                reported framework total is {formatBudget(resources.spent!)}.
                The source figures do not fully reconcile.
              </p>
            )}
          </>
        ) : (
          <p className={typography.caption}>
            No entity allocation reported for this item.
          </p>
        )}
      </Disclosure>
      <Disclosure label="Required, available and expenditure">
        {(
          [
            ["required", "Required resources", "var(--color-neutral-control)"],
            ["available", "Available resources", "var(--color-un-blue-tint)"],
            ["spent", "Expenditure", "var(--color-un-blue)"],
          ] as const
        ).map(([key, label, color]) => (
          <FinancialPanelBreakdownRow
            key={key}
            label={label}
            value={resources[key] == null ? "—" : formatBudget(resources[key])}
            percent={Math.max(
              0,
              ((resources[key] ?? 0) / resourceMaximum) * 100,
            )}
            color={color}
          />
        ))}
        {Object.values(resources).some((value) => value == null) && (
          <p className={typography.caption}>— Not reported.</p>
        )}
      </Disclosure>
    </div>
  );
}
