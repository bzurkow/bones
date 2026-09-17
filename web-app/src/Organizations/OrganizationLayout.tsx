import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import { PageHeader } from "../components";
import { trpc } from "../trpc";
import styles from "./OrganizationLayout.module.css";

export type OrgDetail = Awaited<ReturnType<typeof trpc.organizations.getByName.query>>;

export interface OrganizationOutletContext {
  org: OrgDetail;
  refetchOrg: () => Promise<void>;
}

// Shell for /organizations/<name>/* -- heading + a hairline tab bar over
// an <Outlet />, same shape as Admin/AdminLayout.tsx. Fetches the org
// once here (getByName -- case-insensitive; NOT_FOUND vs FORBIDDEN both
// just mean "redirect to /organizations," this doesn't distinguish them
// for the visitor) and hands it down via Outlet context so
// Profile/Roles/Permissions don't each re-fetch it.
//
// All four tabs are always visible -- "everyone in the org can view, but
// not everyone can update." Each tab gates its own write controls with
// its own org.canUpdate<Tab> flag (see trpc/routers/organizations.ts's
// getByName), not a blanket canEdit -- there's no per-tab *view*
// permission, view is membership alone (already established getting past
// this layout's own fetch above).
export function OrganizationLayout() {
  const { orgName } = useParams<{ orgName: string }>();
  const [org, setOrg] = useState<OrgDetail | undefined>(undefined);
  const [denied, setDenied] = useState(false);

  const load = useCallback(() => {
    if (!orgName) return Promise.resolve(undefined);
    return trpc.organizations.getByName.query({ name: orgName });
  }, [orgName]);

  useEffect(() => {
    if (!orgName) return;
    let cancelled = false;
    // Reset to loading state on every orgName change -- React Router
    // reuses this component instance across param changes on the same
    // route (e.g. a rename's own redirect, see OrganizationProfile.tsx),
    // it doesn't remount, so without this the previous org's data would
    // stay rendered while the new one loads.
    // oxlint-disable-next-line react/set-state-in-effect
    setOrg(undefined);
    // oxlint-disable-next-line react/set-state-in-effect
    setDenied(false);
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
      .then((result) => {
        if (!cancelled && result) setOrg(result);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orgName, load]);

  // Passed down via Outlet context so a tab can refresh the shared org
  // (e.g. after toggling active, or renaming -- see OrganizationProfile.tsx)
  // without each tab running its own duplicate fetch/redirect logic.
  async function refetchOrg() {
    const result = await load();
    if (result) setOrg(result);
  }

  if (denied) return <Navigate to="/organizations" replace />;
  if (!org) return null;

  const tabs = [
    { to: "profile", label: "Profile" },
    { to: "members", label: "Members" },
    { to: "roles", label: "Roles" },
    { to: "permissions", label: "Permissions" },
  ];

  return (
    <PageHeader eyebrow="Organizations" title={org.name}>
      <nav className={styles.tabs}>
        {tabs.map((tab) => (
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
        <Outlet context={{ org, refetchOrg } satisfies OrganizationOutletContext} />
      </div>
    </PageHeader>
  );
}
