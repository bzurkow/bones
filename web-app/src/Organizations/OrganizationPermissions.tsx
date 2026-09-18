import { useCallback, useEffect, useState } from "react";
import { Checkbox } from "@mantine/core";
import { useOutletContext } from "react-router-dom";
import { ErrorMessage } from "../components";
import { trpc } from "../trpc";
import type { OrganizationOutletContext } from "./OrganizationLayout";
import styles from "./OrganizationPermissions.module.css";

type Feature = Awaited<ReturnType<typeof trpc.organizations.features.list.query>>[number];
type Role = Awaited<ReturnType<typeof trpc.organizations.roles.list.query>>[number];
type Grant = Awaited<ReturnType<typeof trpc.organizations.featureRoles.listAll.query>>[number];

// Mirrors Admin/AdminPermissions.tsx, scoped to one organization -- every
// feature this org has (the "Enabled" column, a global-to-this-org kill
// switch) crossed with every one of this org's own roles. Every member
// can view this tab; org.canUpdatePermissions (its own tab-scoped update
// permission, or the global admin.organizations.update override) gates
// every checkbox. Never starts truly empty -- the four built-in tab-
// update features (organization-permissions.ts's
// ORGANIZATION_TAB_UPDATE_FEATURES) are seeded for every organization;
// beyond those, more features only show up once real org-scoped app.*
// functionality gets built -- see organization-features-schema.ts's
// comment on why there's no create-feature form here either, same as the
// global tab.
export function OrganizationPermissions() {
  const { org } = useOutletContext<OrganizationOutletContext>();
  const canEdit = org.canUpdatePermissions;

  const [features, setFeatures] = useState<Feature[] | undefined>(undefined);
  const [roles, setRoles] = useState<Role[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [featuresResult, rolesResult, grantsResult] = await Promise.all([
      trpc.organizations.features.list.query({ organizationId: org.id }),
      trpc.organizations.roles.list.query({ organizationId: org.id }),
      trpc.organizations.featureRoles.listAll.query({ organizationId: org.id }),
    ]);
    setFeatures(featuresResult);
    setRoles(rolesResult);
    setGrants(grantsResult);
  }, [org.id]);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void load().catch((err: unknown) => {
      // A rejected load() here used to be a silent, unhandled promise
      // rejection -- features stayed undefined forever, so the page just
      // rendered blank below the intro paragraph with no visible error at
      // all (the bug that made an earlier real failure hard to diagnose).
      if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load permissions.");
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function isGranted(featureKey: string, role: string): boolean {
    return grants.some((grant) => grant.featureKey === featureKey && grant.role === role && grant.granted);
  }

  async function handleEnabledChange(feature: Feature, enabled: boolean) {
    setError(null);
    setUpdatingCell(`enabled:${feature.key}`);
    try {
      await trpc.organizations.features.setEnabled.mutate({ organizationId: org.id, key: feature.key, enabled });
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
      await trpc.organizations.featureRoles.setGranted.mutate({ organizationId: org.id, featureKey, role, granted });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that permission.");
    } finally {
      setUpdatingCell(null);
    }
  }

  return (
    <div className={styles.stack}>
      <p className={styles.body}>
        Every feature this organization has, whether it&apos;s on at all, and which of its roles have access to it. A
        role with no explicit grant has none -- there&apos;s nothing to configure per role until you check a box.
      </p>

      <ErrorMessage message={error} />

      {features &&
        (features.length === 0 ? (
          <p className={styles.body}>No features yet.</p>
        ) : (
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
                        disabled={!canEdit || updatingCell === `enabled:${feature.key}`}
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
                            disabled={!canEdit || updatingCell === `${feature.key}:${role.name}`}
                            onChange={(event) =>
                              void handleGrantChange(feature.key, role.name, event.currentTarget.checked)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
