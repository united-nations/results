"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";
import {
  explorerSuggestions,
  type ExplorerFilters,
  type ExplorerOptions,
  type ExplorerSuggestion,
} from "@/lib/result-explorer";

export function ResultsSearch({
  query,
  options,
  filters,
  onQueryChange,
  onSelect,
}: {
  query: string;
  options: ExplorerOptions;
  filters: ExplorerFilters;
  onQueryChange: (query: string) => void;
  onSelect: (suggestion: ExplorerSuggestion) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(
    () => explorerSuggestions(options, filters, query),
    [options, filters, query],
  );
  const visible = open && query.trim().length > 0;
  const selectedIndex = Math.min(activeIndex, suggestions.length);
  useEffect(() => {
    if (visible)
      document
        .getElementById(`${id}-${selectedIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [id, selectedIndex, visible]);
  const choose = (index: number) => {
    if (index > 0) onSelect(suggestions[index - 1]);
    setOpen(false);
    setActiveIndex(0);
  };
  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <SearchInput
        variant="border-bottom"
        role="combobox"
        aria-label="Search all results"
        placeholder="Search results or add filters"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={visible}
        aria-controls={visible ? id : undefined}
        aria-activedescendant={visible ? `${id}-${selectedIndex}` : undefined}
        value={query}
        showClear
        onClear={() => {
          onQueryChange("");
          setOpen(false);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            // Native search inputs otherwise clear their text on Escape.
            event.preventDefault();
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) =>
              !visible
                ? 0
                : event.key === "ArrowDown"
                  ? (current + 1) % (suggestions.length + 1)
                  : (current + suggestions.length) % (suggestions.length + 1),
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (visible) choose(selectedIndex);
          }
        }}
      />
      {visible && (
        <ul
          id={id}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-md border border-border bg-background p-1 shadow-md"
        >
          {[null, ...suggestions].map((suggestion, index) => (
            <li
              key={
                suggestion
                  ? `${suggestion.dimension}:${suggestion.value}`
                  : "free-text"
              }
              role="presentation"
            >
              <button
                id={`${id}-${index}`}
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                tabIndex={-1}
                className={`${typography.body} flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-foreground hover:bg-accent ${selectedIndex === index ? "bg-secondary" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                {suggestion ? (
                  <Filter
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Search
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 break-words">
                  {suggestion ? (
                    <>
                      <span className="text-muted-foreground">
                        {suggestion.kind} ·{" "}
                      </span>
                      {suggestion.label}
                    </>
                  ) : (
                    <>Search results for “{query.trim()}”</>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
