"use client";

import { useId } from "react";
import { Grid3X3, LayoutGrid } from "lucide-react";
import { Tooltip } from "@un-eosg/ui/components/tooltip";

export function ResultViewToggle({
  readable,
  onChange,
}: {
  readable: boolean;
  onChange: (readable: boolean) => void;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 inline-flex h-9 shrink-0 rounded-md border border-border bg-secondary p-0.5 any-pointer-coarse:h-11">
      <legend className="sr-only">Card size</legend>
      {[
        { value: false, label: "Compact tiles", Icon: Grid3X3 },
        { value: true, label: "Readable cards", Icon: LayoutGrid },
      ].map(({ value, label, Icon }) => (
        <Tooltip key={label} content={label}>
          <label className="relative block h-full cursor-pointer">
            <input
              type="radio"
              name={name}
              aria-label={label}
              checked={readable === value}
              onChange={() => onChange(value)}
              className="peer sr-only"
            />
            <span className="flex h-full w-9 items-center justify-center rounded-sm text-muted-foreground peer-checked:bg-un-white peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-un-blue">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          </label>
        </Tooltip>
      ))}
    </fieldset>
  );
}
