import "@mantine/core/styles.css";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { hasFeature } from "./AuthHelpers/permissions";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { ApplicationHome } from "./ApplicationHome";
import { ApplicationProfile } from "./ApplicationProfile";
import { ApplicationSettings } from "./ApplicationSettings";
import { AdminLayout } from "./Admin/AdminLayout";
import { AdminUsers } from "./Admin/AdminUsers";
import { AdminTerms } from "./Admin/AdminTerms";
import { AdminPermissions } from "./Admin/AdminPermissions";
import { AdminRoles } from "./Admin/AdminRoles";
import { AdminSiteSettings } from "./Admin/AdminSiteSettings";
import { Login } from "./Login";
import { NotFound } from "./NotFound";
import { SignUp } from "./SignUp";
import { TermsAndConditions } from "./TermsAndConditions";
import { theme } from "shared-ui";
import { useColorScheme } from "./hooks/useColorScheme";

// Gates only the route subtree it wraps (via <Outlet />), rather than the
// whole <Routes> tree -- so which routes require auth is declared in the
// route tree itself, not hardcoded as a path string here. Passes the
// current location through as state so Login can send the user back to
// where they were headed instead of always landing on "/". Redirects to
// /login (not the marketing site) -- that site is a separate origin now
// (see web-static/), and bouncing out to it and back would lose this
// `state` hand-off, since React Router state doesn't survive a cross-origin
// trip.
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

// Nested inside RequireAuth's subtree, so a session is already guaranteed
// here -- this only adds the role check, and sends non-admins back to the
// app home rather than /login (they're logged in, just not authorized).
function RequireAdmin() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!hasFeature(session, "page.admin.view")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function App() {
  // Called here, outside MantineProvider, since its result feeds
  // MantineProvider's own forceColorScheme prop below -- useColorScheme
  // itself doesn't need Mantine's context, only authClient's session.
  const forceColorScheme = useColorScheme();

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto" forceColorScheme={forceColorScheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth />}>
            {/* Sibling to AuthenticatedLayout, not nested inside it -- see
                AuthenticatedLayout.tsx's comment. */}
            <Route path="terms-and-conditions" element={<TermsAndConditions />} />
            <Route element={<AuthenticatedLayout />}>
              <Route index element={<ApplicationHome />} />
              <Route path="profile" element={<ApplicationProfile />} />
              <Route path="settings" element={<ApplicationSettings />} />
              <Route path="admin" element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="permissions" element={<AdminPermissions />} />
                  <Route path="roles" element={<AdminRoles />} />
                  <Route path="site-settings" element={<AdminSiteSettings />} />
                  <Route path="terms" element={<AdminTerms />} />
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
