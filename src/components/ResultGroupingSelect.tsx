"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";

const options = [
  { value: "priority", label: "Group by priority area" },
  { value: "beneficiary", label: "Group by beneficiary" },
  { value: "none", label: "No grouping" },
];

export function ResultGroupingSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const label = options.find((option) => option.value === value)?.label;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="secondary"
          aria-label={`Grouping: ${label}`}
          data-grouping={value}
          className="h-9 border border-border text-foreground max-sm:has-[>svg]:px-2.5 any-pointer-coarse:min-h-11"
        >
          {label}
          <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-explorer-controls
          align="end"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-md border border-border bg-background p-1 shadow-md"
        >
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={onChange}
            aria-label="Group results by"
          >
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={`${typography.body} flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-foreground outline-none data-[highlighted]:bg-accent data-[state=checked]:font-medium any-pointer-coarse:min-h-11`}
              >
                <span className="flex size-4 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-4" aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
