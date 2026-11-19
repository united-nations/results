"use client";

import styles from "./ResultsExplorerControls.module.css";
import { ResultGroupingSelect } from "@/components/ResultGroupingSelect";
import { BudgetStructureFilter } from "@/components/BudgetStructureFilter";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterPopover } from "@un-eosg/ui/components/filter-popover";
import { ResultsSearch } from "@/components/ResultsSearch";
import { Button } from "@un-eosg/ui/components/button";
import { Chip } from "@un-eosg/ui/components/chip";
import { typography } from "@un-eosg/ui/typography";
import {
  filterExplorerResults,
  resultFacetValues,
  type ExplorerResult,
  type ExplorerFilters,
  type ExplorerOptions,
  type FilterDimension,
} from "@/lib/result-explorer";

const labels: Record<FilterDimension, string> = {
  priority: "Priority area",
  beneficiary: "Beneficiary",
  location: "Location",
  budget: "Budget structure",
};

const dimensions = Object.keys(labels) as FilterDimension[];

export function ResultsExplorerControls({
  results,
  options,
  filters,
  query,
  onQueryChange,
  onFiltersChange,
  onClear,
  count,
  grouping,
  onGroupingChange,
  children,
}: {
  results: ExplorerResult[];
  options: ExplorerOptions;
  filters: ExplorerFilters;
  query: string;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: ExplorerFilters) => void;
  onClear: () => void;
  count: number;
  grouping: string;
  onGroupingChange: (grouping: string) => void;
  children?: ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [pointerLeft, setPointerLeft] = useState(24);
  const selectedCount = dimensions.reduce(
    (total, dimension) => total + filters[dimension].length,
    0,
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dimension) => {
          const values = new Map<string, number>();
          for (const result of filterExplorerResults(
            results,
            filters,
            query,
            dimension,
          )) {
            for (const value of new Set(resultFacetValues(result, dimension)))
              values.set(value, (values.get(value) ?? 0) + 1);
          }
          return [dimension, values];
        }),
      ) as Record<FilterDimension, Map<string, number>>,
    [results, filters, query],
  );
  const active =
    dimensions.some((dimension) => filters[dimension].length) ||
    query.trim().length > 0;
  useLayoutEffect(() => {
    if (!filtersOpen) return;
    const controls = controlsRef.current;
    const toggle = toggleRef.current;
    if (!controls || !toggle) return;
    const measure = () => {
      const box = controls.getBoundingClientRect();
      const button = toggle.getBoundingClientRect();
      setPointerLeft(
        Math.max(
          12,
          Math.min(box.width - 12, button.left + button.width / 2 - box.left),
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    observer.observe(toggle);
    measure();
    return () => observer.disconnect();
  }, [filtersOpen, grouping, active, selectedCount]);
  return (
    <div ref={controlsRef} data-explorer-controls className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[min(100%,16rem)] flex-1">
          <ResultsSearch
            query={query}
            options={options}
            filters={filters}
            onQueryChange={onQueryChange}
            onSelect={(suggestion) => {
              onFiltersChange({
                ...filters,
                [suggestion.dimension]: [
                  ...new Set([
                    ...filters[suggestion.dimension],
                    suggestion.value,
                  ]),
                ],
              });
              onQueryChange("");
            }}
          />
        </div>
        {active && (
          <p
            className={`${typography.body} shrink-0 tabular-nums`}
            role="status"
          >
            {count} {count === 1 ? "result" : "results"}
          </p>
        )}

        <Button
          ref={toggleRef}
          variant="secondary"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          className={`h-9 border border-border text-foreground ${filtersOpen ? "bg-muted" : ""}`}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters{selectedCount ? ` (${selectedCount})` : ""}
        </Button>
        <ResultGroupingSelect value={grouping} onChange={onGroupingChange} />
        {children}
      </div>
      <div
        id={filtersId}
        className={styles.filterDisclosure}
        data-open={filtersOpen}
        aria-hidden={!filtersOpen}
        inert={!filtersOpen}
      >
        <div className={styles.filterClip}>
          <div className="relative mt-1.5 space-y-3 rounded-md border border-border bg-background p-3">
            <span
              aria-hidden="true"
              data-filter-pointer
              className="pointer-events-none absolute -top-[5px] size-2.5 -translate-x-1/2 rotate-45 border-s border-t border-border bg-background"
              style={{ left: pointerLeft }}
            />
            <div className="flex flex-wrap items-center gap-2">
              {dimensions.map((dimension) =>
                dimension === "budget" ? (
                  <BudgetStructureFilter
                    key={dimension}
                    options={options.budget}
                    selected={filters.budget}
                    counts={counts.budget}
                    onChange={(budget) =>
                      onFiltersChange({ ...filters, budget })
                    }
                  />
                ) : (
                  <FilterPopover
                    key={dimension}
                    label={labels[dimension]}
                    selected={filters[dimension]}
                    options={options[dimension].map((option) => ({
                      ...option,
                      count: counts[dimension].get(option.value) ?? 0,
                    }))}
                    onChange={(values) =>
                      onFiltersChange({ ...filters, [dimension]: values })
                    }
                    searchLabel={`Search ${labels[dimension].toLowerCase()} options`}
                    className={`border-border bg-secondary text-foreground hover:bg-secondary/80 ${filters[dimension].length ? "bg-muted" : ""}`}
                  />
                ),
              )}
              {active && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-foreground"
                  onClick={onClear}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dimensions.flatMap((dimension) =>
            filters[dimension].map((value) => (
              <Chip
                key={`${dimension}:${value}`}
                density="dense"
                className="text-sm"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    [dimension]: filters[dimension].filter(
                      (item) => item !== value,
                    ),
                  })
                }
                aria-label={`Remove ${labels[dimension].toLowerCase()} filter: ${options[dimension].find((option) => option.value === value)?.label ?? value}`}
              >
                {options[dimension].find((option) => option.value === value)
                  ?.label ?? value}
                <X className="size-3" aria-hidden="true" />
              </Chip>
            )),
          )}
        </div>
      )}
    </div>
  );
}
