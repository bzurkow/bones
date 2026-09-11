import { NavLink, Outlet } from "react-router-dom";
import { hasFeature } from "../AuthHelpers/permissions";
import { PageHeader } from "../components";
import { useEffectivePermissions } from "../hooks/useEffectivePermissions";
import styles from "./AdminLayout.module.css";

// Each tab's own page_views key (db/page-views-schema.ts -- "admin.<tab>",
// its own table now, distinct from routes' single umbrella "admin" key
// RequireAdmin (App.tsx) already gates the whole /admin subtree on). A
// role can have route access without every individual page view (e.g.
// "demo" per the seed data gets every admin.* page view today, but a
// future role might not) -- so each tab is only shown if the current
// session actually has it.
const TABS = [
  { to: "users", label: "Users", feature: "admin.users" },
  { to: "permissions", label: "Feature Flags & Permissions", feature: "admin.permissions" },
  { to: "roles", label: "Roles", feature: "admin.roles" },
  { to: "site-settings", label: "Site Settings", feature: "admin.site-settings" },
  { to: "terms", label: "Terms & Conditions", feature: "admin.terms" },
];

// Shell for the /admin/* route tree: heading + a hairline tab bar over an
// <Outlet />, so each tab
// (AdminUsers/AdminPermissions/AdminSiteSettings/AdminTerms) is its own
// real route rather than client-only tab state -- bookmarkable/shareable
// like the rest of the app. Gated by RequireAdmin in App.tsx, not here --
// this only decides which tabs *render*, not whether the section as a
// whole is reachable.
//
// "permissions" combines what were two separate tabs (feature flags,
// RBAC) into one -- see AdminPermissions.tsx for why the underlying
// concepts still stay distinct.
export function AdminLayout() {
  const { features: effectiveFeatures } = useEffectivePermissions();
  const visibleTabs = TABS.filter((tab) => hasFeature(effectiveFeatures, tab.feature));

  return (
    <PageHeader eyebrow="Admin" title="Admin">
      <nav className={styles.tabs}>
        {visibleTabs.map((tab) => (
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
