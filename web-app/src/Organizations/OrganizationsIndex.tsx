import { useEffect, useState } from "react";
import { Avatar } from "@mantine/core";
import { Link } from "react-router-dom";
import { ErrorMessage, PageHeader } from "../components";
import { trpc } from "../trpc";
import styles from "./OrganizationsIndex.module.css";

type Organization = Awaited<ReturnType<typeof trpc.organizations.listForCurrentUser.query>>[number];

// The application-level (not /admin) home for organizations -- reachable
// by any signed-in user, no page.* feature key: what shows up here is
// entirely membership-driven (listForCurrentUser returns the caller's own
// memberships, plus every organization for anyone holding the global
// admin.organizations.update override), so gating the route itself behind
// a flat permission would fight that. Each card links to
// /organizations/<name> (OrganizationDetail.tsx), which re-derives and
// enforces the same access rule server-side rather than trusting that
// reaching this page implies anything about a specific org.
export function OrganizationsIndex() {
  const [organizations, setOrganizations] = useState<Organization[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.listForCurrentUser
      .query()
      .then((result) => {
        if (!cancelled) setOrganizations(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load organizations.");
          setOrganizations([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageHeader eyebrow="Organizations" title="Organizations">
      <ErrorMessage message={error} />

      {organizations && organizations.length === 0 && (
        <p className={styles.empty}>You're not part of any organizations yet.</p>
      )}

      {organizations && organizations.length > 0 && (
        <div className={styles.grid}>
          {organizations.map((org) => (
            <Link key={org.id} to={`/organizations/${encodeURIComponent(org.name)}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <Avatar src={org.avatarUrl ?? undefined} alt={org.name} size={40} radius="xl" />
                {!org.active && <span className={styles.inactiveTag}>Inactive</span>}
              </div>
              <h3 className={styles.cardTitle}>{org.name}</h3>
              {org.blurb && <p className={styles.cardBlurb}>{org.blurb}</p>}
              <span className={styles.cardMeta}>
                {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageHeader>
  );
}
