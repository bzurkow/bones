import { useEffect, useState } from "react";
import { Checkbox } from "@mantine/core";
import { hasFeature } from "../AuthHelpers/permissions";
import { ErrorMessage } from "../components";
import { useEffectivePermissions } from "../hooks/useEffectivePermissions";
import { trpc } from "../trpc";
import panelStyles from "./AdminPanel.module.css";
import styles from "./AdminPermissions.module.css";

type Role = Awaited<ReturnType<typeof trpc.roles.list.query>>[number];

interface Item {
  key: string;
  label: string;
  enabled: boolean;
}

interface GridProps<G> {
  title: string;
  description: string;
  items: Item[] | undefined;
  roles: Role[];
  grants: G[];
  grantKeyOf: (grant: G) => string;
  isGranted: (grant: G, itemKey: string, role: string) => boolean;
  canEnable: boolean;
  canDisable: boolean;
  canUpdateGrants: boolean;
  // Per-role, whether a currently-true grant can be unchecked at all --
  // features/routes only protect "owner"; page_views also protects
  // "administrator" (a direct ask, narrower than the other two).
  isGrantLocked: (role: string) => boolean;
  updatingCell: string | null;
  onEnabledChange: (item: Item, enabled: boolean) => void;
  onGrantChange: (itemKey: string, role: string, granted: boolean) => void;
}

// One reusable grid for all three "item x role" tables (features, routes,
// page_views) -- same shape, same enable/disable-permission split, same
// per-role grant locking, just a different backing item/grant type per
// caller. Kept as a plain function in this file rather than its own
// component module -- only ever used here, three times.
function PermissionGrid<G>({
  title,
  description,
  items,
  roles,
  grants,
  grantKeyOf,
  isGranted,
  canEnable,
  canDisable,
  canUpdateGrants,
  isGrantLocked,
  updatingCell,
  onEnabledChange,
  onGrantChange,
}: GridProps<G>) {
  return (
    <section>
      <h2 className={panelStyles.sectionTitle}>{title}</h2>
      <p className={panelStyles.sectionDescription}>{description}</p>

      {items && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{title}</th>
                <th>Enabled</th>
                {roles.map((role) => (
                  <th key={role.name}>{role.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td>{item.label}</td>
                  <td>
                    <Checkbox
                      aria-label={`${item.label} enabled`}
                      checked={item.enabled}
                      // Enable and disable are separate permissions --
                      // which one applies depends on which direction
                      // clicking this checkbox would actually go.
                      disabled={updatingCell === `enabled:${item.key}` || !(item.enabled ? canDisable : canEnable)}
                      onChange={(event) => onEnabledChange(item, event.currentTarget.checked)}
                    />
                  </td>
                  {roles.map((role) => {
                    const granted = grants.some(
                      (grant) => grantKeyOf(grant) === item.key && isGranted(grant, item.key, role.name),
                    );
                    return (
                      <td key={role.name}>
                        <Checkbox
                          aria-label={`${item.label} for ${role.name}`}
                          checked={granted}
                          disabled={
                            updatingCell === `${item.key}:${role.name}` ||
                            !canUpdateGrants ||
                            (isGrantLocked(role.name) && granted)
                          }
                          onChange={(event) => onGrantChange(item.key, role.name, event.currentTarget.checked)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function isOwnerLocked(role: string) {
  return role === "owner";
}

function isOwnerOrAdminLocked(role: string) {
  return role === "owner" || role === "administrator";
}

// Three separate tables in the DB (features/routes/page_views, each with
// its own -roles join) shown together here as one page, since managing
// them is the same admin activity even though the underlying concepts are
// distinct (see each schema file's own comment on why they're split):
// features are in-page actions, routes are the umbrella "can enter this
// section" gate, page_views are per-tab visibility within a route.
export function AdminPermissions() {
  const { features: effectiveFeatures } = useEffectivePermissions();
  const canEnable = hasFeature(effectiveFeatures, "admin.features.enable");
  const canDisable = hasFeature(effectiveFeatures, "admin.features.disable");
  const canUpdateGrants = hasFeature(effectiveFeatures, "admin.role-permissions.update");

  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Item[] | undefined>(undefined);
  const [featureGrants, setFeatureGrants] = useState<Awaited<ReturnType<typeof trpc.featureRoles.listAll.query>>>([]);
  const [routes, setRoutes] = useState<Item[] | undefined>(undefined);
  const [routeGrants, setRouteGrants] = useState<Awaited<ReturnType<typeof trpc.routeRoles.listAll.query>>>([]);
  const [pageViews, setPageViews] = useState<Item[] | undefined>(undefined);
  const [pageViewGrants, setPageViewGrants] = useState<Awaited<ReturnType<typeof trpc.pageViewRoles.listAll.query>>>(
    [],
  );
  // Which single cell has a change in flight, across all three tables --
  // "enabled:<key>" for a kill switch, "<key>:<role>" for a grant --
  // disables just that checkbox so a second click can't fire before the
  // first resolves.
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [rolesResult, featuresResult, featureGrantsResult, routesResult, routeGrantsResult, pageViewsResult, pageViewGrantsResult] =
      await Promise.all([
        trpc.roles.list.query(),
        trpc.features.list.query(),
        trpc.featureRoles.listAll.query(),
        trpc.routes.list.query(),
        trpc.routeRoles.listAll.query(),
        trpc.pageViews.list.query(),
        trpc.pageViewRoles.listAll.query(),
      ]);
    setRoles(rolesResult);
    setFeatures(featuresResult);
    setFeatureGrants(featureGrantsResult);
    setRoutes(routesResult);
    setRouteGrants(routeGrantsResult);
    setPageViews(pageViewsResult.map((pageView) => ({ key: pageView.key, label: pageView.label, enabled: pageView.enabled })));
    setPageViewGrants(pageViewGrantsResult);
  }

  useEffect(() => {
    // Same legitimate fetch-on-mount case AdminSiteSettings.tsx's own
    // load() effect documents.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, []);

  async function handleEnabledChange(kind: "features" | "routes" | "pageViews", item: Item, enabled: boolean) {
    setError(null);
    setUpdatingCell(`enabled:${item.key}`);
    try {
      await trpc[kind].setEnabled.mutate({ key: item.key, enabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that.");
    } finally {
      setUpdatingCell(null);
    }
  }

  async function handleFeatureGrantChange(featureKey: string, role: string, granted: boolean) {
    setError(null);
    setUpdatingCell(`${featureKey}:${role}`);
    try {
      await trpc.featureRoles.setGranted.mutate({ featureKey, role, granted });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that permission.");
    } finally {
      setUpdatingCell(null);
    }
  }

  async function handleRouteGrantChange(routeKey: string, role: string, granted: boolean) {
    setError(null);
    setUpdatingCell(`${routeKey}:${role}`);
    try {
      await trpc.routeRoles.setGranted.mutate({ routeKey, role, granted });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that permission.");
    } finally {
      setUpdatingCell(null);
    }
  }

  async function handlePageViewGrantChange(pageViewKey: string, role: string, granted: boolean) {
    setError(null);
    setUpdatingCell(`${pageViewKey}:${role}`);
    try {
      await trpc.pageViewRoles.setGranted.mutate({ pageViewKey, role, granted });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that permission.");
    } finally {
      setUpdatingCell(null);
    }
  }

  return (
    <div className={panelStyles.stack}>
      <p className={panelStyles.body}>
        Every feature, route, and page in the app, whether it&apos;s on at all, and which roles have access to
        it. A role with no explicit grant has none -- there&apos;s nothing to configure per role until you check
        a box.
      </p>

      <ErrorMessage message={error} />

      <PermissionGrid
        title="Features"
        description="In-page actions -- viewing, updating, creating, deleting."
        items={features}
        roles={roles}
        grants={featureGrants}
        grantKeyOf={(grant) => grant.featureKey}
        isGranted={(grant) => grant.granted}
        canEnable={canEnable}
        canDisable={canDisable}
        canUpdateGrants={canUpdateGrants}
        isGrantLocked={isOwnerLocked}
        updatingCell={updatingCell}
        onEnabledChange={(item, enabled) => void handleEnabledChange("features", item, enabled)}
        onGrantChange={(key, role, granted) => void handleFeatureGrantChange(key, role, granted)}
      />

      <PermissionGrid
        title="Routes"
        description="The umbrella gate for a whole authenticated section -- can a role enter it at all."
        items={routes}
        roles={roles}
        grants={routeGrants}
        grantKeyOf={(grant) => grant.routeKey}
        isGranted={(grant) => grant.granted}
        canEnable={canEnable}
        canDisable={canDisable}
        canUpdateGrants={canUpdateGrants}
        isGrantLocked={isOwnerLocked}
        updatingCell={updatingCell}
        onEnabledChange={(item, enabled) => void handleEnabledChange("routes", item, enabled)}
        onGrantChange={(key, role, granted) => void handleRouteGrantChange(key, role, granted)}
      />

      <PermissionGrid
        title="Page views"
        description="Per-tab visibility within a route. Owner and administrator's access here can't be revoked."
        items={pageViews}
        roles={roles}
        grants={pageViewGrants}
        grantKeyOf={(grant) => grant.pageViewKey}
        isGranted={(grant) => grant.granted}
        canEnable={canEnable}
        canDisable={canDisable}
        canUpdateGrants={canUpdateGrants}
        isGrantLocked={isOwnerOrAdminLocked}
        updatingCell={updatingCell}
        onEnabledChange={(item, enabled) => void handleEnabledChange("pageViews", item, enabled)}
        onGrantChange={(key, role, granted) => void handlePageViewGrantChange(key, role, granted)}
      />
    </div>
  );
}
