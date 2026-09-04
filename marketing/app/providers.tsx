"use client";

import { MantineProvider } from "@mantine/core";
import { theme } from "ui";
import type { ReactNode } from "react";

// Split out from layout.tsx because MantineProvider needs a Client
// Component boundary (it's context-based), while layout.tsx stays a Server
// Component so it can export `metadata`.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {children}
    </MantineProvider>
  );
}
