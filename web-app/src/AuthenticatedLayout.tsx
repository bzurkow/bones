import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { TopBar } from "./TopBar";

// /terms-and-conditions is a sibling route to this layout (App.tsx), not
// nested inside it -- so this check never runs while already there,
// avoiding a self-redirect loop, and that page renders full-page without
// TopBar/ColorSchemeToggle rather than the normal app chrome.
//
// Redirects only on a real false, not null. null means nothing's posted
// to accept at all (see terms-and-conditions.ts's
// getHasAcceptedTermsAndConditions) -- redirecting on null too would loop
// forever: TermsAndConditions.tsx has nothing to show in that case and
// bounces straight back to "/", which would just send it right back here
// again, since nothing about the null state ever changes on its own.
export function AuthenticatedLayout() {
  const { data: session } = authClient.useSession();

  if (session?.hasAcceptedTermsAndConditions === false) {
    return <Navigate to="/terms-and-conditions" replace />;
  }

  return (
    <>
      <TopBar />
      <ColorSchemeToggle />
      <Outlet />
    </>
  );
}
