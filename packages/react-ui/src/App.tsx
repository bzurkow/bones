import "@mantine/core/styles.css";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { theme, cssVariablesResolver } from "./theme";
import { Landing } from "./Landing";

function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return null;
  }

  if (!session && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
      <HashRouter>
        <AuthGate>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />
          </Routes>
        </AuthGate>
      </HashRouter>
    </MantineProvider>
  );
}
