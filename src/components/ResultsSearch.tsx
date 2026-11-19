"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const input = useRef<HTMLInputElement>(null);
  const listbox = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(
    () => explorerSuggestions(options, filters, query),
    [options, filters, query],
  );
  const visible = open && query.trim().length > 0;
  const selectedIndex = Math.min(activeIndex, suggestions.length);
  useEffect(() => {
    const list = listbox.current;
    const option = document.getElementById(`${id}-${selectedIndex}`);
    if (!visible || !list || !option) return;
    const bounds = list.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < bounds.top) list.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom)
      list.scrollTop += item.bottom - bounds.bottom;
  }, [id, selectedIndex, visible]);
  const choose = (index: number) => {
    if (index > 0) onSelect(suggestions[index - 1]);
    setOpen(false);
    setActiveIndex(0);
    if (window.matchMedia("(pointer: coarse)").matches) input.current?.blur();
  };
  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <SearchInput
        ref={input}
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
          ref={listbox}
          id={id}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[min(20rem,40dvh)] overflow-y-auto overscroll-contain rounded-md border border-border bg-background p-1 shadow-md sm:max-h-80"
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
                className={`${typography.body} flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-foreground hover:bg-accent any-pointer-coarse:min-h-11 ${selectedIndex === index ? "bg-secondary" : ""}`}
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
