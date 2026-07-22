"use client";

import { cn } from "@/lib/utils";
import { type ReactNode, useState } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {trigger}
      </span>
      {open && (
        <div
          className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className={cn("card dialog-panel max-w-md w-full")}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            {description && (
              <div className="text-sm text-slate-400 mt-2">{description}</div>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                variant={variant === "danger" ? "danger" : "primary"}
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
