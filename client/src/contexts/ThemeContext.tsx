import type { ReactNode } from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

type Theme = "light" | "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, setTheme } = useNextTheme();
  const resolvedTheme: Theme = theme === "dark" ? "dark" : "light";

  return {
    theme: resolvedTheme,
    setTheme: (nextTheme: Theme) => setTheme(nextTheme),
    toggleTheme: () => setTheme(resolvedTheme === "light" ? "dark" : "light"),
    switchable: true,
  };
}
