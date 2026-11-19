"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, centred dialog on larger screens. Built on Radix Dialog for focus trapping,
 * Escape-to-close and screen-reader labelling.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "md" | "lg" | "full";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] border border-line bg-surface shadow-2xl outline-none",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]",
            size === "md" && "sm:max-w-lg",
            size === "lg" && "sm:max-w-2xl",
            size === "full" && "h-[92dvh] sm:h-[85dvh] sm:max-w-3xl",
            className,
          )}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-surface-3 sm:hidden" aria-hidden />
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-3">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>}
            </div>
            <Dialog.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer ? <div className="shrink-0 border-t border-line px-5 py-3 safe-bottom">{footer}</div> : <div className="safe-bottom" />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
