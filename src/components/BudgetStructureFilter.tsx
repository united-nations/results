"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@un-eosg/ui/components/selector-popover";
import { typography } from "@un-eosg/ui/typography";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import type { ExplorerOption } from "@/lib/result-explorer";

type BudgetNode = ExplorerOption & { children: BudgetNode[] };

export function BudgetStructureFilter({
  options,
  selected,
  counts,
  onChange,
}: {
  options: ExplorerOption[];
  selected: string[];
  counts: Map<string, number>;
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = useMemo(() => {
    const nodes = new Map(
      options.map((option) => [
        option.value,
        { ...option, children: [] } as BudgetNode,
      ]),
    );
    const roots: BudgetNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parent ? nodes.get(node.parent) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }, [options]);
  const terms = searchTerms(query);
  function matching(nodes: BudgetNode[]): BudgetNode[] {
    if (!terms.length) return nodes;
    return nodes.flatMap((node) => {
      if (terms.every((term) => normalizeSearchText(node.label).includes(term)))
        return [node];
      const children = matching(node.children);
      return children.length ? [{ ...node, children }] : [];
    });
  }
  function render(nodes: BudgetNode[], depth = 0) {
    return nodes.map((node) => {
      const open = terms.length > 0 || expanded.has(node.value);
      const label = node.treeLabel ?? node.label;
      return (
        <li key={node.value}>
          <div
            className="flex items-center gap-1 rounded-sm hover:bg-accent"
            style={{ paddingInlineStart: depth * 16 }}
          >
            {node.children.length ? (
              <button
                type="button"
                aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
                aria-expanded={open}
                className="flex size-6 shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(node.value)) next.delete(node.value);
                    else next.add(node.value);
                    return next;
                  })
                }
              >
                <ChevronRight
                  className={`size-4 ${open ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <label
              className={`${typography.body} flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 pe-2`}
            >
              <input
                type="checkbox"
                checked={selected.includes(node.value)}
                className="size-4 shrink-0 accent-un-blue"
                onChange={() =>
                  onChange(
                    selected.includes(node.value)
                      ? selected.filter((value) => value !== node.value)
                      : [...selected, node.value],
                  )
                }
              />
              <span className="min-w-0 flex-1 truncate" title={label}>
                {label}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {counts.get(node.value) ?? 0}
              </span>
            </label>
          </div>
          {node.children.length > 0 && open && (
            <ul>{render(node.children, depth + 1)}</ul>
          )}
        </li>
      );
    });
  }
  const visible = matching(tree);
  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`border-border bg-secondary text-foreground hover:bg-secondary/80 ${selected.length ? "bg-muted" : ""}`}
        >
          Budget structure {selected.length ? `(${selected.length})` : ""}
          <ChevronDown className="opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[28rem] p-2">
        <SearchInput
          aria-label="Search budget structure options"
          placeholder="Search budget structure"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery("")}
        />
        <ul
          aria-label="Budget structure hierarchy"
          className="mt-2 max-h-80 overflow-y-auto"
        >
          {render(visible)}
        </ul>
        {!visible.length && (
          <p className={`${typography.body} p-2`}>No matching budget items.</p>
        )}
        {selected.length > 0 && (
          <Button
            variant="link"
            size="sm"
            className="text-foreground"
            onClick={() => onChange([])}
          >
            Clear budget filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
