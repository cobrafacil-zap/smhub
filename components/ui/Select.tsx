"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("input pr-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%221.5%22><path d=%22M3 4.5 6 7.5 9 4.5%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
