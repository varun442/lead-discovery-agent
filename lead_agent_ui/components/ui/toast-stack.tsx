"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastKind = "error" | "info" | "success";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

function iconFor(kind: ToastKind) {
  if (kind === "error") return <AlertCircle className="h-4 w-4 text-red-300" />;
  if (kind === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  return <Info className="h-4 w-4 text-zinc-200" />;
}

function roleFor(kind: ToastKind): "alert" | "status" {
  return kind === "error" ? "alert" : "status";
}

export function ToastStack({ items, onDismiss, autoDismissMs = 4000 }: ToastStackProps) {
  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((item) =>
      window.setTimeout(() => {
        onDismiss(item.id);
      }, autoDismissMs)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, autoDismissMs, onDismiss]);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-full max-w-sm flex-col gap-2">
      {items.map((toast) => (
        <div
          key={toast.id}
          role={roleFor(toast.kind)}
          className="pointer-events-auto rounded-xl border border-border bg-card/95 px-3 py-2 shadow-soft"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{iconFor(toast.kind)}</span>
            <p className="flex-1 text-sm text-foreground">{toast.message}</p>
            <button
              type="button"
              className="rounded-md border border-border p-1 text-muted hover:text-foreground"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
