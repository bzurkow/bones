import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

export function AuthenticatedLayout() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}
