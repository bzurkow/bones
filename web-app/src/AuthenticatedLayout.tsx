import { Outlet } from "react-router-dom";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { TopBar } from "./TopBar";

export function AuthenticatedLayout() {
  return (
    <>
      <TopBar />
      <ColorSchemeToggle />
      <Outlet />
    </>
  );
}
