-- RBAC for the Authorization Protocols section of the Site Settings admin
-- page (web-app/src/Admin/AdminSiteSettings.tsx). No new page.* key --
-- per the request, this section is gated by the same page.admin.site-settings
-- key that already gates the page itself (0011_workable_flatman.sql), not a
-- section-specific page key.
--
-- view gates the section's visibility on that page (client-side, via
-- hasFeature); update gates authProtocolsRouter's setEnabled mutation
-- (backend/src/trpc/routers/auth-protocols.ts) -- list itself stays
-- publicProcedure, unrelated to this: Login.tsx/SignUp.tsx need it with no
-- session at all.
INSERT INTO "features" ("key", "label", "enabled") VALUES
	('admin.auth-protocols.view', 'Admin > Authorization Protocols > View', true),
	('admin.auth-protocols.update', 'Admin > Authorization Protocols > Update', true);

-- Per the request: everyone but standard can view; only owner and
-- administrator can update. Same "missing row = not granted" convention as
-- every other seed here (permissions.ts's hasPermission) -- standard gets no
-- view row, and demo gets no update row.
INSERT INTO "feature_roles" ("feature_key", "role", "granted") VALUES
	('admin.auth-protocols.view', 'owner', true),
	('admin.auth-protocols.view', 'administrator', true),
	('admin.auth-protocols.view', 'demo', true),
	('admin.auth-protocols.update', 'owner', true),
	('admin.auth-protocols.update', 'administrator', true);
