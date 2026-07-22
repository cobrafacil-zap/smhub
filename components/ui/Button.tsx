"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";
import { Magnetic } from "./motion/Magnetic";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Efeito magnético sutil (translate em direção ao cursor) — para CTAs. */
  magnetic?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-royal-500 to-royal-700 text-white shadow-sm hover:from-royal-400 hover:to-royal-600 active:from-royal-700 active:to-royal-800 shine",
  secondary:
    "bg-bg-elevated border border-border text-slate-200 hover:bg-bg-muted hover:border-border-muted shadow-sm",
  outline:
    "border border-royal-500/50 text-royal-300 hover:bg-royal-500/10 hover:border-royal-500",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-700",
  ghost: "text-slate-300 hover:bg-bg-elevated",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      magnetic = false,
      disabled,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const button = (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "group inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        ) : (
          iconLeft && (
            <span className="-ml-0.5 inline-flex transition-transform group-hover:scale-110">
              {iconLeft}
            </span>
          )
        )}
        {children}
        {iconRight && !loading && (
          <span className="-mr-0.5 inline-flex transition-transform duration-200 group-hover:translate-x-0.5">
            {iconRight}
          </span>
        )}
      </button>
    );

    if (magnetic && !isDisabled) {
      return <Magnetic>{button}</Magnetic>;
    }
    return button;
  }
);
Button.displayName = "Button";
