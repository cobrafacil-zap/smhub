"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * Wrapper do next-themes. Aplica a classe `dark` no <html> (attribute="class"),
 * tema padrão `dark` (o site todo é escuro hoje), respeita a preferência do SO
 * e persiste em localStorage.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}