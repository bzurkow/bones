import { Outlet } from "react-router-dom";
import { DevColorSchemeToggle } from "./DevColorSchemeToggle";
import { TopBar } from "./TopBar";

export function AuthenticatedLayout() {
  return (
    <>
      <TopBar />
      {/* TODO(temporary): see DevColorSchemeToggle.tsx */}
      <DevColorSchemeToggle />
      <Outlet />
    </>
  );
}
