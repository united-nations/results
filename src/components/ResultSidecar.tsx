"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { SidecarContent } from "@/components/SidecarContent";
import { formatBudgetHeading } from "@/lib/budget-text";

export function ResultSidecar({
  title,
  label,
  eyebrow,
  source,
  supportingText,
  children,
}: {
  title: string;
  label?: string;
  eyebrow?: string;
  source: string;
  supportingText?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const heading = formatBudgetHeading(title);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1 text-base font-normal">
            {label && (
              <>
                <span className={`${typography.meta} me-1 font-normal`}>
                  {label}
                </span>{" "}
              </>
            )}
            {heading}
            {supportingText && (
              <span className={`${typography.meta} mt-0.5 block font-normal`}>
                {supportingText}
              </span>
            )}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </Dialog.Trigger>
      <SidecarContent
        title={heading}
        eyebrow={eyebrow || label || "Programme budget result"}
        closeLabel="Close result"
        onClose={() => setOpen(false)}
        headerMetadata={
          <ExternalLink
            href={source}
            className={`${typography.meta} text-un-blue-text underline underline-offset-4`}
          >
            View budget document
          </ExternalLink>
        }
      >
        {children}
      </SidecarContent>
    </Dialog.Root>
  );
}
