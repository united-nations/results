"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { SidecarContent } from "@/components/SidecarContent";
import { useOverviewFocus } from "@/components/OverviewFocus";
import { formatBudgetHeading } from "@/lib/budget-text";
import { cn } from "@/lib/utils";
import type { BudgetResultContext } from "@/lib/programme-budget";

export function ResultSidecar({
  title,
  label,
  eyebrow,
  source,
  supportingText,
  context,
  children,
  trigger,
  renderTrigger,
  resultId,
  focusGroup,
}: {
  title: string;
  label?: string;
  eyebrow?: string;
  source: string;
  supportingText?: string;
  context?: BudgetResultContext;
  children: ReactNode;
  trigger?: ReactElement;
  renderTrigger?: (trigger: ReactElement) => ReactNode;
  resultId?: string;
  focusGroup?: string;
}) {
  const [open, setOpen] = useState(false);
  useOverviewFocus(
    context
      ? {
          kind: "result",
          entityId: context.entity.id,
          groupId: focusGroup,
          subprogrammeId: context.subprogramme?.id,
          resultId,
          title,
          source,
        }
      : null,
    open,
  );
  const heading = formatBudgetHeading(title);
  const dialogTrigger = (
    <Dialog.Trigger asChild>
      {trigger ?? (
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className={`${typography.body} min-w-0 flex-1 font-normal`}>
            {label && (
              <>
                <span className={`${typography.caption} me-1`}>
                  {label}
                </span>{" "}
              </>
            )}
            {heading}
            {supportingText && (
              <span className={`${typography.caption} mt-0.5 block`}>
                {supportingText}
              </span>
            )}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      )}
    </Dialog.Trigger>
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {renderTrigger ? renderTrigger(dialogTrigger) : dialogTrigger}
      <SidecarContent
        title={heading}
        eyebrow={eyebrow || label || "Programme budget result"}
        closeLabel="Close result"
        onClose={() => setOpen(false)}
        headerMetadata={
          <div className="space-y-2">
            {context && (
              <nav
                aria-label="Result context"
                className={`${typography.body} flex flex-col items-start gap-1`}
              >
                <Link
                  href={`/entities/${context.entity.id}/`}
                  className="text-un-blue-text underline underline-offset-4"
                >
                  {context.entity.code &&
                  context.entity.code !== context.entity.name
                    ? `${context.entity.code} · ${context.entity.name}`
                    : context.entity.name}
                </Link>
                {context.subprogramme && (
                  <Link
                    href={`/entities/${context.entity.id}/${context.subprogramme.id}/`}
                    className="text-un-blue-text underline underline-offset-4"
                  >
                    Subprogramme {context.subprogramme.number} ·{" "}
                    {context.subprogramme.name}
                  </Link>
                )}
              </nav>
            )}
            <ExternalLink
              href={source}
              className={cn(
                typography.caption,
                "text-un-blue-text underline underline-offset-4",
              )}
            >
              View budget document
            </ExternalLink>
          </div>
        }
      >
        {children}
      </SidecarContent>
    </Dialog.Root>
  );
}
