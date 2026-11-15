"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, X } from "lucide-react";
import { DetailPanel } from "@un-eosg/ui/components/detail-panel";
import { DetailPanelControls } from "@un-eosg/ui/components/detail-panel-controls";
import { typography } from "@un-eosg/ui/typography";

export function ResultSidecar({
  title,
  label,
  source,
  children,
}: {
  title: string;
  label: string;
  source: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className={`${typography.subTitle} min-w-0 flex-1`}>
            {label && (
              <span className={`${typography.meta} me-2 font-normal`}>
                {label}
              </span>
            )}
            {title}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 end-0 z-50 w-full border-s bg-background shadow-lg motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right sm:max-w-2xl lg:max-w-3xl"
        >
          <DetailPanel
            eyebrow={label || "Programme budget result"}
            title={
              <Dialog.Title asChild>
                <span>{title}</span>
              </Dialog.Title>
            }
            headerMetadata={
              <a
                href={source}
                className={`${typography.meta} text-un-blue-text underline underline-offset-4`}
              >
                View budget document
              </a>
            }
            controls={
              <DetailPanelControls
                close={{
                  label: "Close result",
                  icon: <X className="size-4" aria-hidden />,
                  onClick: () => setOpen(false),
                }}
              />
            }
          >
            <div className="space-y-5">{children}</div>
          </DetailPanel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
