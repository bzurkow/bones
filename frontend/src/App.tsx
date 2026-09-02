import "@mantine/core/styles.css";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { isAdmin } from "./AuthHelpers/roles";
import { Landing } from "./Landing";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { ApplicationHome } from "./ApplicationHome";
import { ApplicationProfile } from "./ApplicationProfile";
import { ApplicationSettings } from "./ApplicationSettings";
import { AdminLayout } from "./Admin/AdminLayout";
import { AdminUsers } from "./Admin/AdminUsers";
import { AdminAuth } from "./Admin/AdminAuth";
import { AdminRoles } from "./Admin/AdminRoles";
import { Login } from "./Login";
import { NotFound } from "./NotFound";
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
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// Nested inside RequireAuth's subtree, so a session is already guaranteed
// here -- this only adds the role check, and sends non-admins back to the
// app home rather than /welcome (they're logged in, just not authorized).
function RequireAdmin() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!isAdmin(session?.user)) {
    return <Navigate to="/" replace />;
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
          <Route path="/welcome" element={<Landing />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth />}>
            <Route element={<AuthenticatedLayout />}>
              <Route index element={<ApplicationHome />} />
              <Route path="profile" element={<ApplicationProfile />} />
              <Route path="settings" element={<ApplicationSettings />} />
              <Route path="admin" element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="auth" element={<AdminAuth />} />
                  <Route path="roles" element={<AdminRoles />} />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
