import "@mantine/core/styles.css";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { Landing } from "./Landing";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { ApplicationHome } from "./ApplicationHome";

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
    <MantineProvider forceColorScheme="light">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Landing />} />
          <Route element={<RequireAuth />}>
            <Route element={<AuthenticatedLayout />}>
              <Route path="/" element={<ApplicationHome />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
