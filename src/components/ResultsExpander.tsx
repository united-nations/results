"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { typography } from "@un-eosg/ui/typography";
import { cn } from "@/lib/utils";

const countLabels = {
  result: "results",
  entity: "entities",
};

export function ResultsExpander({
  title,
  count,
  countUnit = "result",
  headingLevel,
  nested = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  countUnit?: keyof typeof countLabels;
  headingLevel?: 2 | 3 | 4;
  nested?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const Heading = headingLevel ? (`h${headingLevel}` as const) : "span";

  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary
        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
          expanded ? "bg-accent" : nested ? "bg-muted" : "bg-un-blue-surface"
        }`}
      >
        <Heading
          className={cn(
            nested ? typography.body : typography.subTitle,
            nested && "font-semibold",
            "min-w-0 wrap-break-word",
          )}
        >
          {title}
        </Heading>
        <span className="flex shrink-0 items-center gap-3">
          {count !== undefined && (
            <span className={cn(typography.meta, "tabular-nums")}>
              {count} {count === 1 ? countUnit : countLabels[countUnit]}
            </span>
          )}
          {expanded ? (
            <Minus className="size-4 text-un-blue-text-aaa" aria-hidden />
          ) : (
            <Plus className="size-4 text-un-blue-text-aaa" aria-hidden />
          )}
        </span>
      </summary>
      {expanded && children}
    </details>
  );
}
