import { NavLink, Outlet } from "react-router-dom";
import { PageHeader } from "../components";
import styles from "./AdminLayout.module.css";

const TABS = [
  { to: "users", label: "Users" },
  { to: "permissions", label: "Feature Flags & Permissions" },
  { to: "site-settings", label: "Site Settings" },
  { to: "terms", label: "Terms & Conditions" },
];

// Shell for the /admin/* route tree: heading + a hairline tab bar over an
// <Outlet />, so each tab
// (AdminUsers/AdminPermissions/AdminSiteSettings/AdminTerms) is its own
// real route rather than client-only tab state -- bookmarkable/shareable
// like the rest of the app. Gated by RequireAdmin in App.tsx, not here.
//
// "permissions" combines what were two separate tabs (feature flags,
// RBAC) into one -- see AdminPermissions.tsx for why the underlying
// concepts still stay distinct.
export function AdminLayout() {
  return (
    <PageHeader eyebrow="Admin" title="Admin">
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
    </PageHeader>
  );
}
