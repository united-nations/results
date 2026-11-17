"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { SearchablePicker } from "@/components/SearchablePicker";
import { typography } from "@un-eosg/ui/typography";
import type { BudgetHierarchyNode } from "@/lib/budget-scope";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";

function filterNodes(
  nodes: BudgetHierarchyNode[],
  terms: string[],
  ancestors = "",
): BudgetHierarchyNode[] {
  if (!terms.length) return nodes;
  return nodes.flatMap((node) => {
    const path = `${ancestors} ${normalizeSearchText(node.label)}`;
    if (terms.every((term) => path.includes(term))) return [node];
    const children = filterNodes(node.children, terms, path);
    return children.length ? [{ ...node, children }] : [];
  });
}

function branchContains(node: BudgetHierarchyNode, id: string): boolean {
  return (
    node.id === id || node.children.some((child) => branchContains(child, id))
  );
}

function BudgetBranch({
  node,
  selectedId,
  initialOpen,
  onSelect,
}: {
  node: BudgetHierarchyNode;
  selectedId?: string;
  initialOpen: boolean;
  onSelect: (node: BudgetHierarchyNode) => void;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      initialOpen || Boolean(selectedId && branchContains(node, selectedId)),
  );
  return (
    <li>
      <div className="flex items-start">
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        <button
          type="button"
          aria-pressed={selectedId === node.id}
          className={`${typography.body} flex min-h-8 min-w-0 flex-1 items-start justify-between gap-2 rounded-sm px-2 py-1 text-start hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-pressed:bg-un-blue-surface`}
          onClick={() => onSelect(node)}
        >
          <span>{node.label}</span>
          {selectedId === node.id && (
            <Check
              className="mt-0.5 size-4 shrink-0 text-un-blue-text"
              aria-hidden
            />
          )}
        </button>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="ms-4 border-s ps-1">
          {node.children.map((child) => (
            <BudgetBranch
              key={child.id}
              node={child}
              selectedId={selectedId}
              initialOpen={initialOpen}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function BudgetHierarchySelect({
  hierarchy,
  selected,
  onChange,
}: {
  hierarchy: BudgetHierarchyNode[];
  selected: BudgetHierarchyNode | null;
  onChange: (node: BudgetHierarchyNode | null) => void;
}) {
  return (
    <SearchablePicker
      label="Filter by budget structure"
      searchLabel="Search budget structure"
      placeholder="Search parts, sections, entities or subprogrammes"
      selection={selected?.label}
      align="end"
      className="w-xl p-2"
    >
      {(query, close) => {
        const terms = searchTerms(query);
        const visible = filterNodes(hierarchy, terms);
        function choose(node: BudgetHierarchyNode | null) {
          onChange(node?.id === selected?.id ? null : node);
          close();
        }
        return (
          <>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => choose(null)}
            >
              All budget locations
            </Button>
            {visible.length ? (
              <ul className="space-y-0.5" key={query}>
                {visible.map((node) => (
                  <BudgetBranch
                    key={node.id}
                    node={node}
                    selectedId={selected?.id}
                    initialOpen={terms.length > 0}
                    onSelect={choose}
                  />
                ))}
              </ul>
            ) : (
              <p className={`${typography.meta} px-2 py-3`}>
                No matching budget locations.
              </p>
            )}
          </>
        );
      }}
    </SearchablePicker>
  );
}
