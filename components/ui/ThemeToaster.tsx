"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

/**
 * Toaster com tema sincronizado ao tema global (claro/escuro).
 * O sonner Toaster aceita theme="light"|"dark"|"system"; aqui acompanha
 * o resolvedTheme do next-themes.
 */
export function ThemeToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={(resolvedTheme === "dark" ? "dark" : "light") as "dark" | "light"}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "bg-bg-elevated border border-border text-slate-100 shadow-elevated",
          title: "text-slate-100",
          description: "text-slate-400",
        },
      }}
    />
  );
}