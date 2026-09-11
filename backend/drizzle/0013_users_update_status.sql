-- Data-only migration -- no schema change (features/feature_roles' shape
-- is unchanged from 0012), so there's nothing for `drizzle-kit generate` to
-- diff; this file is hand-written, same escape-hatch precedent as
-- 0010/0011's hand-appended seed data.
--
-- admin.users.update-status wasn't in the original RBAC sketch (only
-- view/update-owner/update-role were) -- added because AdminUsers.tsx's
-- active/inactive dropdown needs its own permission distinct from
-- update-role, the same way update-owner is split out from update-role.
-- Seeded owner+administrator:true, matching update-role's own grant
-- pattern (roughly the same sensitivity: changing a non-owner user's
-- account state).
INSERT INTO "features" ("key", "label", "enabled") VALUES
	('admin.users.update-status', 'Admin > Users > Update Status', true);

INSERT INTO "feature_roles" ("feature_key", "role", "granted") VALUES
	('admin.users.update-status', 'owner', true),
	('admin.users.update-status', 'administrator', true);
