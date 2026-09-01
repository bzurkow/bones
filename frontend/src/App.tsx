import "@mantine/core/styles.css";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { Landing } from "./Landing";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { ApplicationHome } from "./ApplicationHome";
import { Login } from "./Login";
import { theme } from "./theme";
import { DevColorSchemeToggle } from "./DevColorSchemeToggle";

// Gates only the route subtree it wraps (via <Outlet />), rather than the
// whole <Routes> tree -- so which routes require auth is declared in the
// route tree itself, not hardcoded as a path string here. Passes the
// current location through as state so Login can send the user back to
// where they were headed instead of always landing on "/".
function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {/* TODO(temporary): remove once there's enough real UI to eyeball
          both modes without it -- see DevColorSchemeToggle.tsx. */}
      <DevColorSchemeToggle />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<RequireAuth />}>
            <Route element={<AuthenticatedLayout />}>
              <Route index element={<ApplicationHome />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
