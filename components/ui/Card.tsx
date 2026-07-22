import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  hoverable,
  shine,
  spotlight,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  shine?: boolean;
  spotlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "card",
        hoverable && "card-hover",
        shine && "shine",
        spotlight && "spotlight",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-slate-100", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-400 mt-1", className)} {...props} />
  );
}

export function CardSection({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-5 border-t border-border first:border-t-0",
        className
      )}
      {...props}
    />
  );
}

export function CardEmpty({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-10 flex flex-col items-center justify-center text-center",
        className
      )}
      {...props}
    />
  );
}
