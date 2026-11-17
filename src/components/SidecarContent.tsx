"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { DetailPanel } from "@un-eosg/ui/components/detail-panel";
import { DetailPanelControls } from "@un-eosg/ui/components/detail-panel-controls";

export function SidecarContent({
  title,
  eyebrow,
  headerMetadata,
  closeLabel,
  onClose,
  onCloseAutoFocus,
  children,
}: {
  title: string;
  eyebrow?: string;
  headerMetadata?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
      <Dialog.Content
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="fixed inset-y-0 end-0 z-50 w-full border-s bg-background shadow-lg motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right sm:max-w-2xl lg:max-w-3xl"
      >
        <DetailPanel
          eyebrow={eyebrow}
          title={
            <Dialog.Title asChild>
              <span>{title}</span>
            </Dialog.Title>
          }
          headerMetadata={headerMetadata}
          controls={
            <DetailPanelControls
              close={{
                label: closeLabel,
                icon: <X className="size-4" aria-hidden />,
                onClick: onClose,
              }}
            />
          }
        >
          <div className="space-y-5">{children}</div>
        </DetailPanel>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
