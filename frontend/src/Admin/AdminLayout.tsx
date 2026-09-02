import { NavLink, Outlet } from "react-router-dom";
import { Eyebrow } from "../components";
import styles from "./AdminLayout.module.css";

const TABS = [
  { to: "users", label: "Users" },
  { to: "auth", label: "Auth" },
  { to: "roles", label: "Role-based permissions" },
];

// Shell for the /admin/* route tree: heading + a hairline tab bar over an
// <Outlet />, so each tab (AdminUsers/AdminAuth/AdminRoles) is its own real
// route rather than client-only tab state -- bookmarkable/shareable like
// the rest of the app. Gated by RequireAdmin in App.tsx, not here.
export function AdminLayout() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Eyebrow>Admin</Eyebrow>
        <h1 className={styles.title}>Admin</h1>
      </div>

      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
