import "@mantine/core/styles.css";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { Landing } from "./Landing";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { Home } from "./Home";

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
    <MantineProvider forceColorScheme="light">
      <HashRouter>
        <AuthGate>
          <Routes>
            <Route path="/login" element={<Landing />} />
            <Route element={<AuthenticatedLayout />}>
              <Route path="/" element={<Home />} />
            </Route>
          </Routes>
        </AuthGate>
      </HashRouter>
    </MantineProvider>
  );
}
