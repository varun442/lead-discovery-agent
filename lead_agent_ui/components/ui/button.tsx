import * as React from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({ className, isLoading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl border border-transparent px-5 text-sm font-medium text-white transition-all",
        "bg-gradient-to-r from-accent to-violet-600 shadow-glow hover:scale-[1.01] hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
}
