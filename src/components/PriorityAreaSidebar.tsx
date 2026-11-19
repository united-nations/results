"use client";

import { useState, type ReactElement } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@un-eosg/ui/components/button";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import { SidecarContent } from "@/components/SidecarContent";
import {
  useCurrentOverviewFocus,
  useOverviewFocus,
} from "@/components/OverviewFocus";
import {
  priorityAreaIntroduction,
  priorityAreaReport,
} from "@/lib/priority-area-context";

export function PriorityAreaSidebar({
  priority,
  disabled = false,
  trigger,
}: {
  priority: string;
  disabled?: boolean;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const parentFocus = useCurrentOverviewFocus();
  const [focusGroup, setFocusGroup] = useState<string>();
  const introduction = priorityAreaIntroduction(priority);
  useOverviewFocus({ kind: "priority", priority, groupId: focusGroup }, open);
  if (!introduction) return null;
  const pages = [
    ...new Set(introduction.sections.map((section) => section.printedPage)),
  ].sort((a, b) => a - b);
  const pageLabel =
    pages.length === 1 ? `p. ${pages[0]}` : `pp. ${pages[0]}–${pages.at(-1)}`;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (value) setFocusGroup(parentFocus?.groupId);
        setOpen(value);
      }}
    >
      <Dialog.Trigger asChild disabled={disabled}>
        {trigger ?? (
          <Button
            variant="link"
            size="sm"
            disabled={disabled}
            aria-label={`Learn more. ${priority}`}
            className="inline h-auto rounded-none p-0 text-sm leading-[inherit] font-normal text-foreground underline underline-offset-4"
          >
            Learn more.
          </Button>
        )}
      </Dialog.Trigger>
      <SidecarContent
        title={priority}
        eyebrow={`Priority area · Annual report ${priorityAreaReport.reportYear}`}
        closeLabel="Close priority area"
        onClose={() => setOpen(false)}
      >
        {introduction.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className={typography.sectionTitle}>{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className={typography.prose}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <footer aria-label="Sources" className="space-y-3 border-t pt-6">
          <h2 className={typography.subTitle}>Source</h2>
          <p className={typography.body}>{priorityAreaReport.reportTitle}</p>
          <ExternalLink
            href={`${priorityAreaReport.inspectedCopy}#page=${introduction.pdfPage}`}
            className={`${typography.body} inline-block underline underline-offset-4`}
          >
            View annual report {priorityAreaReport.reportYear}, {pageLabel}
          </ExternalLink>
        </footer>
      </SidecarContent>
    </Dialog.Root>
  );
}
