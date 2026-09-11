import { useEffect, useState } from "react";
import { Checkbox } from "@mantine/core";
import { hasFeature } from "../AuthHelpers/permissions";
import { ErrorMessage } from "../components";
import { useEffectivePermissions } from "../hooks/useEffectivePermissions";
import { trpc } from "../trpc";
import panelStyles from "./AdminPanel.module.css";
import styles from "./AdminPermissions.module.css";

type Feature = Awaited<ReturnType<typeof trpc.features.list.query>>[number];
type Role = Awaited<ReturnType<typeof trpc.roles.list.query>>[number];
type Grant = Awaited<ReturnType<typeof trpc.featureRoles.listAll.query>>[number];

// Every feature in the app (the "Enabled" column -- a global kill switch,
// independent of any role) crossed with every role's own grant for it (the
// rest of the row) -- both concepts live in one table by design, not two
// kept in sync (see the RBAC migration's own comment on features-schema.ts).
export function AdminPermissions() {
  const { features: effectiveFeatures } = useEffectivePermissions();
  const canEnable = hasFeature(effectiveFeatures, "admin.features.enable");
  const canDisable = hasFeature(effectiveFeatures, "admin.features.disable");
  const canUpdateGrants = hasFeature(effectiveFeatures, "admin.role-permissions.update");
  const [features, setFeatures] = useState<Feature[] | undefined>(undefined);
  const [roles, setRoles] = useState<Role[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  // Which single cell has a change in flight -- "enabled:<key>" for the
  // kill switch, "<key>:<role>" for a grant -- disables just that
  // checkbox so a second click can't fire before the first resolves.
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [featuresResult, rolesResult, grantsResult] = await Promise.all([
      trpc.features.list.query(),
      trpc.roles.list.query(),
      trpc.featureRoles.listAll.query(),
    ]);
    setFeatures(featuresResult);
    setRoles(rolesResult);
    setGrants(grantsResult);
  }

  useEffect(() => {
    // Same legitimate fetch-on-mount case AdminSiteSettings.tsx's own
    // load() effect documents.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, []);

  function isGranted(featureKey: string, role: string): boolean {
    return grants.some((grant) => grant.featureKey === featureKey && grant.role === role && grant.granted);
  }

  async function handleEnabledChange(feature: Feature, enabled: boolean) {
    setError(null);
    setUpdatingCell(`enabled:${feature.key}`);
    try {
      await trpc.features.setEnabled.mutate({ key: feature.key, enabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that feature.");
    } finally {
      setUpdatingCell(null);
    }
  }

  async function handleGrantChange(featureKey: string, role: string, granted: boolean) {
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

  return (
    <div className={panelStyles.stack}>
      <p className={panelStyles.body}>
        Every feature in the app, whether it&apos;s on at all, and which roles have access to it. A role with
        no explicit grant has none -- there&apos;s nothing to configure per role until you check a box.
      </p>

      <ErrorMessage message={error} />

      {features && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Enabled</th>
                {roles.map((role) => (
                  <th key={role.name}>{role.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.key}>
                  <td>{feature.label}</td>
                  <td>
                    <Checkbox
                      aria-label={`${feature.label} enabled`}
                      checked={feature.enabled}
                      // Enable and disable are separate permissions (see
                      // features.ts's setEnabled) -- which one applies
                      // depends on which direction clicking this checkbox
                      // would actually go.
                      disabled={
                        updatingCell === `enabled:${feature.key}` || !(feature.enabled ? canDisable : canEnable)
                      }
                      onChange={(event) => void handleEnabledChange(feature, event.currentTarget.checked)}
                    />
                  </td>
                  {roles.map((role) => {
                    const granted = isGranted(feature.key, role.name);
                    return (
                      <td key={role.name}>
                        <Checkbox
                          aria-label={`${feature.label} for ${role.name}`}
                          checked={granted}
                          // Owner's grant, once true, can never be
                          // unchecked (see feature-roles.ts's setGranted --
                          // enforced there too, this is just matching UI,
                          // not the only thing stopping it). Otherwise
                          // needs admin.role-permissions.update to change
                          // anything at all.
                          disabled={
                            updatingCell === `${feature.key}:${role.name}` ||
                            !canUpdateGrants ||
                            (role.name === "owner" && granted)
                          }
                          onChange={(event) => void handleGrantChange(feature.key, role.name, event.currentTarget.checked)}
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
    </div>
  );
}
