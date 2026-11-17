"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@un-eosg/ui/components/selector-popover";

export function SearchablePicker({
  label,
  selection,
  searchLabel,
  placeholder = searchLabel,
  align = "start",
  className,
  children,
}: {
  label: string;
  selection?: string;
  searchLabel: string;
  placeholder?: string;
  align?: "start" | "end";
  className: string;
  children: (query: string, close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={selection ? `${label}: ${selection}` : label}
          className="max-w-full rounded-full border border-border bg-muted text-foreground hover:bg-neutral-border"
        >
          <span className="truncate">{selection ?? label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={className} align={align} aria-label={label}>
        <SearchInput
          aria-label={searchLabel}
          placeholder={placeholder}
          variant="border-bottom"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery("")}
        />
        {children(query, () => changeOpen(false))}
      </PopoverContent>
    </Popover>
  );
}
