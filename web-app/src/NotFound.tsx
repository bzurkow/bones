import { Link } from "react-router-dom";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { NotFoundPage } from "./components";

// Catch-all for any route that doesn't match -- wired in App.tsx as
// path="*", the last route in the tree, outside RequireAuth entirely, so
// reachable both signed in and signed out. "/" is always a safe
// destination regardless of auth state: RequireAuth redirects to /login on
// its own if there's no session.
export function NotFound() {
  return (
    <>
      <ColorSchemeToggle />
      <NotFoundPage linkComponent={Link} linkProps={{ to: "/" }} />
    </>
  );
}
