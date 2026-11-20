"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ResultCard } from "@/components/ResultCard";
import { SidecarContent } from "@/components/SidecarContent";
import { useOverviewFocus } from "@/components/OverviewFocus";
import { formatBudgetHeading } from "@/lib/budget-text";
import type { BudgetResultContext } from "@/lib/programme-budget";

export function ResultSidecar({
  title,
  label,
  eyebrow,
  source,
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
        <ResultCard
          resultTitle={heading}
          metadata={context ? { entity: context.entity } : undefined}
        />
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
      >
        {children}
      </SidecarContent>
    </Dialog.Root>
  );
}
