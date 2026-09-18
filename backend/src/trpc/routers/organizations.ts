import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import {
  organizationFeatureRoles,
  organizationFeatures,
  organizationRoles,
  organizationUsers,
  organizations,
  users,
} from "../../db/schema.js";
import {
  CHATBOT_FEATURE_KEY,
  ORGANIZATION_TAB_UPDATE_FEATURES,
  canUpdateOrg,
  canViewOrg,
} from "../../organization-permissions.js";
import { hasPermission } from "../../permissions.js";
import { AVATAR_BUCKET, getPresignedUploadUrl, resolveAvatarUrl } from "../../storage/index.js";
import { ALLOWED_AVATAR_CONTENT_TYPES } from "../../user-fields.js";
import { protectedProcedure, requireOrganizationPermission, requirePermission, router } from "../trpc.js";
import { organizationFeatureRolesRouter } from "./organization-feature-roles.js";
import { organizationFeaturesRouter } from "./organization-features.js";
import { organizationRolesRouter } from "./organization-roles.js";

// Every organization's starting role set -- see organization-roles-schema.ts's
// own comment for what each one means/is protected for. Seeded here (a
// new org, in the same transaction as the org row itself) and in this
// table's own migration (every *existing* org, backfilled once).
const DEFAULT_ORGANIZATION_ROLES = ["admin", "standard", "viewer"] as const;

// Human-readable labels for ORGANIZATION_TAB_UPDATE_FEATURES -- keyed the
// same way features-schema.ts's own seed data pairs a key with a label.
const TAB_UPDATE_FEATURE_LABELS: Record<(typeof ORGANIZATION_TAB_UPDATE_FEATURES)[number], string> = {
  "profile.update": "Profile > Update",
  "members.update": "Members > Update",
  "roles.update": "Roles > Update",
  "permissions.update": "Permissions > Update",
};

const EXTENSION_FOR_CONTENT_TYPE: Record<(typeof ALLOWED_AVATAR_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// name is looked up/compared case-insensitively everywhere (the
// /organizations/<name> route treats case as insignificant, matching
// organizations_name_lower_uidx's own lower(name) index) -- a plain
// lower(name) = lower($1) equality, not ilike, which would also interpret
// literal `%`/`_` in a name as wildcards.
function byNameCaseInsensitive(name: string) {
  return sql`lower(${organizations.name}) = lower(${name})`;
}

const ORG_MEMBER_SORTABLE_COLUMNS = {
  name: users.name,
  email: users.email,
  role: organizationUsers.role,
} as const;
const orgMemberSortKeys = Object.keys(ORG_MEMBER_SORTABLE_COLUMNS) as [
  keyof typeof ORG_MEMBER_SORTABLE_COLUMNS,
  ...(keyof typeof ORG_MEMBER_SORTABLE_COLUMNS)[],
];

// "Active org admin" means all three: an organization_users row with
// role "admin", that row's own active flag (not soft-removed from the
// org), and the underlying user's own global active flag (not
// deactivated account-wide) -- a deactivated user shouldn't count toward
// keeping the org staffed even if nobody's gotten around to removing
// their membership yet. Backs the "an org can never be left with zero
// active admins" guard setMemberRole/removeMember both enforce below.
function activeOrgAdminCondition(organizationId: string) {
  return and(
    eq(organizationUsers.organizationId, organizationId),
    eq(organizationUsers.role, "admin"),
    eq(organizationUsers.active, true),
    eq(users.active, true),
  );
}

async function countActiveOrgAdmins(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(organizationUsers)
    .innerJoin(users, eq(organizationUsers.userId, users.id))
    .where(activeOrgAdminCondition(organizationId));
  return row?.total ?? 0;
}

async function isActiveOrgAdmin(organizationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: organizationUsers.userId })
    .from(organizationUsers)
    .innerJoin(users, eq(organizationUsers.userId, users.id))
    .where(and(activeOrgAdminCondition(organizationId), eq(organizationUsers.userId, userId)));
  return Boolean(row);
}

// Shared by setMemberRole (demoting) and removeMember (removing) -- both
// are "this member stops being an active admin" in different clothes, so
// both need the exact same "would this leave zero left" check. Only
// throws when the member being acted on is currently one of the admins
// being counted (a no-op demote, or removing a non-admin, never needs to
// count anything).
async function assertNotLastActiveAdmin(organizationId: string, userId: string): Promise<void> {
  if (!(await isActiveOrgAdmin(organizationId, userId))) return;
  if ((await countActiveOrgAdmins(organizationId)) <= 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An organization must always have at least one active admin.",
    });
  }
}

export const organizationsRouter = router({
  // admin.organizations.view, not merely protectedProcedure -- unlike
  // roles.ts's own list (nothing sensitive, no permission of its own),
  // Organizations has a real, explicit view permission (see the seed
  // migration's comment for why: reaching the tab at all needs
  // page.admin.organizations, but a role can have that without also
  // having admin.organizations.view, same "reach the tab, still get
  // FORBIDDEN" shape as AdminUsers.tsx's own admin.users.view). This
  // backs the Admin > Organizations table specifically -- a different
  // audience/purpose than listForCurrentUser below, which is what
  // /organizations (the personal cards page) actually reads.
  //
  // memberCount is a LEFT JOIN + count, not a per-row subquery -- one
  // query for the whole table, grouped by organization so an org with
  // zero members still gets a row (LEFT, not INNER). The join condition
  // itself excludes soft-removed rows (organizationUsers.active) rather
  // than filtering them in a WHERE -- a WHERE would turn the LEFT JOIN
  // back into an effective INNER JOIN for any org that has ONLY removed
  // members, dropping it from the result entirely.
  list: requirePermission("admin.organizations.view").query(async () => {
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        blurb: organizations.blurb,
        active: organizations.active,
        avatarUrl: organizations.avatarUrl,
        memberCount: count(organizationUsers.userId),
      })
      .from(organizations)
      .leftJoin(
        organizationUsers,
        and(eq(organizationUsers.organizationId, organizations.id), eq(organizationUsers.active, true)),
      )
      .groupBy(organizations.id);

    return Promise.all(rows.map(async (row) => ({ ...row, avatarUrl: await resolveAvatarUrl(row.avatarUrl) })));
  }),

  // Every organization the caller is a member of, plus -- if they hold the
  // global override -- every organization there is (same "permissioned"
  // set the /organizations/<name> redirect rule checks against, just
  // listed instead of gated). Feeds /organizations, the personal cards
  // page: reachable by any signed-in user, no page.* feature key of its
  // own -- what each caller sees is entirely membership-driven, which
  // would conflict with also gating the route behind a flat permission.
  listForCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const canViewAll = await hasPermission(ctx.session.user.role, "admin.organizations.update");

    let memberOrgIds: string[] | undefined;
    if (!canViewAll) {
      const memberRows = await db
        .select({ organizationId: organizationUsers.organizationId })
        .from(organizationUsers)
        .where(and(eq(organizationUsers.userId, ctx.session.user.id), eq(organizationUsers.active, true)));
      memberOrgIds = memberRows.map((row) => row.organizationId);
      if (memberOrgIds.length === 0) return [];
    }

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        blurb: organizations.blurb,
        active: organizations.active,
        avatarUrl: organizations.avatarUrl,
        memberCount: count(organizationUsers.userId),
      })
      .from(organizations)
      .leftJoin(
        organizationUsers,
        and(eq(organizationUsers.organizationId, organizations.id), eq(organizationUsers.active, true)),
      )
      .where(memberOrgIds ? inArray(organizations.id, memberOrgIds) : undefined)
      .groupBy(organizations.id);

    return Promise.all(rows.map(async (row) => ({ ...row, avatarUrl: await resolveAvatarUrl(row.avatarUrl) })));
  }),

  // Backs /organizations/<name>. Case-insensitive lookup (see
  // byNameCaseInsensitive's own comment) -- NOT_FOUND if no such
  // organization exists at all, FORBIDDEN if it exists but the caller
  // can't view it (canViewOrg above, membership or the global override);
  // the page itself catches either and redirects to /organizations, it
  // doesn't distinguish them for the visitor.
  //
  // Everyone who can view the org can see all four tabs -- there's no
  // per-tab *view* gate -- but each tab's own write controls need its own
  // canUpdate<Tab> flag, computed the same way requireOrganizationPermission
  // checks it server-side (canUpdateOrg: the global admin.organizations.
  // update override, or this member's own org-scoped grant for that tab's
  // update key), so the page doesn't need a round-trip per tab just to
  // know what to render.
  getByName: protectedProcedure.input(z.object({ name: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [org] = await db.select().from(organizations).where(byNameCaseInsensitive(input.name));
    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No organization with that name." });
    }

    if (!(await canViewOrg(org.id, ctx.session.user.id, ctx.session.user.role))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const [canUpdateProfile, canUpdateMembers, canUpdateRoles, canUpdatePermissions] = await Promise.all([
      canUpdateOrg(org.id, ctx.session.user.id, ctx.session.user.role, "profile.update"),
      canUpdateOrg(org.id, ctx.session.user.id, ctx.session.user.role, "members.update"),
      canUpdateOrg(org.id, ctx.session.user.id, ctx.session.user.role, "roles.update"),
      canUpdateOrg(org.id, ctx.session.user.id, ctx.session.user.role, "permissions.update"),
    ]);

    return {
      ...org,
      avatarUrl: await resolveAvatarUrl(org.avatarUrl),
      canUpdateProfile,
      canUpdateMembers,
      canUpdateRoles,
      canUpdatePermissions,
    };
  }),

  // Users matched by name/email, for the Create modal's initial-admin
  // picker -- no organizationId yet (the org doesn't exist until this
  // form submits), unlike searchAddableUsers below. Gated by
  // application.organizations.create (the same permission the actual
  // create action needs), not admin.users.view -- picking an initial
  // admin shouldn't require a whole separate admin-users permission just
  // because it happens to search the same table.
  searchUsers: requirePermission("application.organizations.create")
    .input(z.object({ search: z.string().min(1) }))
    .query(({ input }) =>
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(or(ilike(users.name, `%${input.search}%`), ilike(users.email, `%${input.search}%`)))
        .limit(10),
    ),

  // application.organizations.create, not an admin.organizations.create --
  // that key deliberately doesn't exist (see the seed migration's
  // comment). Creating an organization is an application-level action;
  // the admin tab is currently the only surface that calls this, but the
  // permission gating it isn't admin-specific.
  //
  // Every organization must have an initial admin from the moment it
  // exists -- inserted in the same transaction as the organization row
  // itself, not a separate follow-up call, so there's never a window where
  // the org exists with zero members.
  create: requirePermission("application.organizations.create")
    .input(
      z.object({
        name: z.string().min(1),
        blurb: z.string().default(""),
        initialAdminUserId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(byNameCaseInsensitive(input.name));
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An organization with that name already exists." });
      }

      const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.initialAdminUserId));
      if (!admin) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That user doesn't exist." });
      }

      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organizations)
          .values({ id: crypto.randomUUID(), name: input.name, blurb: input.blurb })
          .returning();
        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't create that organization." });
        }

        // Roles before membership -- organization_users.role has a real
        // FK onto organization_roles (see that file's own comment), so
        // the role rows have to exist before the initial admin's
        // membership row can reference one of them.
        await tx
          .insert(organizationRoles)
          .values(DEFAULT_ORGANIZATION_ROLES.map((name) => ({ organizationId: created.id, name })));

        // The four tab-update features (see organization-permissions.ts's
        // own comment), seeded here rather than left for someone to
        // create later -- same reasoning the global RBAC seed migration
        // gives for admin.features.create/page.admin.roles being seeded
        // rather than left absent. "admin" is granted all four,
        // immediately and permanently (organization-feature-roles.ts's
        // setGranted refuses to ever revoke them) -- "org admin must
        // have all update permissions in the organization."
        await tx.insert(organizationFeatures).values(
          ORGANIZATION_TAB_UPDATE_FEATURES.map((key) => ({
            organizationId: created.id,
            key,
            label: TAB_UPDATE_FEATURE_LABELS[key],
          })),
        );
        await tx.insert(organizationFeatureRoles).values(
          ORGANIZATION_TAB_UPDATE_FEATURES.map((key) => ({
            organizationId: created.id,
            featureKey: key,
            role: "admin",
            granted: true,
          })),
        );

        // The chatbot feature (organization-permissions.ts's
        // CHATBOT_FEATURE_KEY) -- enabled but deliberately ungranted to
        // any role, unlike the four tab-update features above. Same row
        // 0024_chatbot_feature_seed.sql backfills for every existing org.
        await tx.insert(organizationFeatures).values({
          organizationId: created.id,
          key: CHATBOT_FEATURE_KEY,
          label: "Chatbot",
        });

        await tx.insert(organizationUsers).values({
          organizationId: created.id,
          userId: input.initialAdminUserId,
          role: "admin",
        });

        return created;
      });
    }),

  // Name/blurb only -- active has its own procedure below (setActive),
  // same split as admin.ts's setUserRole/setUserActive: a settings-gear
  // confirm-modal action reads as a different kind of change than a plain
  // form field, even though both ultimately set a column on this table.
  // Gated by the Profile tab's own update permission (requireOrganizationPermission,
  // not the global-only requirePermission) -- the global
  // admin.organizations.update still works too, as the override
  // canUpdateOrg always checks first (see trpc.ts's own comment). The
  // input field is `organizationId`, not `id` -- requireOrganizationPermission
  // reads that exact field name off the raw input before it's parsed.
  update: requireOrganizationPermission("profile.update")
    .input(
      z.object({
        organizationId: z.string().min(1),
        name: z.string().min(1),
        blurb: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(and(byNameCaseInsensitive(input.name), ne(organizations.id, input.organizationId)));
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An organization with that name already exists." });
      }

      const [updated] = await db
        .update(organizations)
        .set({ name: input.name, blurb: input.blurb })
        .where(eq(organizations.id, input.organizationId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown organization." });
      }

      return updated;
    }),

  // The settings-gear confirm-modal action -- see update's own comment for
  // why this is separate (and for the organizationId field name/gating).
  setActive: requireOrganizationPermission("profile.update")
    .input(z.object({ organizationId: z.string().min(1), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(organizations)
        .set({ active: input.active })
        .where(eq(organizations.id, input.organizationId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown organization." });
      }

      return updated;
    }),

  // Same pattern as profile.ts's requestAvatarUpload/confirmAvatarUpload
  // (a presigned PUT the browser uploads directly to, AWS creds never
  // reach the client), keyed by organizationId instead of the caller's
  // own user id -- gated by the Profile tab's own update permission, since
  // this is an org attribute an editor sets, not a self-service upload
  // like a user's own avatar.
  requestAvatarUpload: requireOrganizationPermission("profile.update")
    .input(z.object({ organizationId: z.string().min(1), contentType: z.enum(ALLOWED_AVATAR_CONTENT_TYPES) }))
    .mutation(async ({ input }) => {
      const key = `org/${input.organizationId}/${crypto.randomUUID()}.${EXTENSION_FOR_CONTENT_TYPE[input.contentType]}`;
      const uploadUrl = await getPresignedUploadUrl(AVATAR_BUCKET, key, input.contentType);
      return { uploadUrl, key };
    }),

  confirmAvatarUpload: requireOrganizationPermission("profile.update")
    .input(z.object({ organizationId: z.string().min(1), key: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (!input.key.startsWith(`org/${input.organizationId}/`)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That upload doesn't belong to this organization." });
      }

      const [updated] = await db
        .update(organizations)
        .set({ avatarUrl: input.key })
        .where(eq(organizations.id, input.organizationId))
        .returning({ avatarUrl: organizations.avatarUrl });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown organization." });
      }

      return { avatarUrl: await resolveAvatarUrl(updated.avatarUrl) };
    }),

  // Paginated/searched/sorted, same shape as admin.ts's listUsers -- backs
  // the org detail page's own members table ("all the features of our
  // existing admin users table"). canViewOrg-gated, not
  // admin.organizations.view -- that key is specifically the Admin table's
  // own gate; seeing your own org's roster here only needs to be a member
  // (or hold the global override), same rule as getByName.
  listMembers: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        search: z.string().optional(),
        sortBy: z.enum(orgMemberSortKeys).optional(),
        sortDirection: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!(await canViewOrg(input.organizationId, ctx.session.user.id, ctx.session.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const trimmedSearch = input.search?.trim();
      const condition = and(
        eq(organizationUsers.organizationId, input.organizationId),
        eq(organizationUsers.active, true),
        trimmedSearch
          ? or(ilike(users.name, `%${trimmedSearch}%`), ilike(users.email, `%${trimmedSearch}%`))
          : undefined,
      );
      const sortColumn = ORG_MEMBER_SORTABLE_COLUMNS[input.sortBy ?? "name"];
      const order = input.sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn);

      const [rows, [totalRow], activeAdminCount] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            role: organizationUsers.role,
            // Whether this member's own (global) account is active --
            // not shown as its own column, just enough for the frontend
            // to know if THIS row is one of the admins activeAdminCount
            // below is counting (assertNotLastActiveAdmin's rule counts
            // only role "admin" + active membership + active user, all
            // three -- a role="admin" row here whose user account is
            // deactivated doesn't count, so it shouldn't read as "the
            // last admin" and get its own remove/demote blocked).
            userActive: users.active,
          })
          .from(organizationUsers)
          .innerJoin(users, eq(organizationUsers.userId, users.id))
          .where(condition)
          .orderBy(order)
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db
          .select({ total: count() })
          .from(organizationUsers)
          .innerJoin(users, eq(organizationUsers.userId, users.id))
          .where(condition),
        // Org-wide, not paginated -- the Members tab uses this to decide,
        // per row, whether that row is the org's last active admin (see
        // assertNotLastActiveAdmin, the same rule enforced server-side on
        // the actual write) so it can disable removing/demoting them
        // before the request round-trips, not just after it 400s.
        countActiveOrgAdmins(input.organizationId),
      ]);

      const members = await Promise.all(
        rows.map(async (row) => ({ ...row, avatarUrl: await resolveAvatarUrl(row.avatarUrl) })),
      );

      return { members, total: totalRow?.total ?? 0, activeAdminCount };
    }),

  // Exact email match only, not a name/email substring search -- a
  // members.update grant is meant to be a narrow "manage this org's
  // roster" permission, not "browse the whole user directory." A live
  // search-as-you-type (this procedure's original shape) let anyone with
  // that one narrow grant enumerate every user's name and email by typing
  // partial strings -- a real data leak, since browsing the user
  // directory that way is otherwise an admin.users.view-level capability.
  // Requiring the caller to already know the exact address closes that:
  // it can confirm a guess, not power one. Returns null both when no such
  // user exists and when they're already a member -- same non-
  // distinguishing shape organizations.getByName uses for NOT_FOUND vs.
  // FORBIDDEN, so this can't be used to enumerate which emails exist
  // either. Case-insensitive, same reasoning as byNameCaseInsensitive.
  findAddableUserByEmail: requireOrganizationPermission("members.update")
    .input(z.object({ organizationId: z.string().min(1), email: z.string().email() }))
    .query(async ({ input }) => {
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${input.email})`);
      if (!user) return null;

      const [existingMember] = await db
        .select({ userId: organizationUsers.userId })
        .from(organizationUsers)
        .where(
          and(
            eq(organizationUsers.organizationId, input.organizationId),
            eq(organizationUsers.userId, user.id),
            eq(organizationUsers.active, true),
          ),
        );
      if (existingMember) return null;

      return user;
    }),

  // New members always start "standard" -- promoting one to "admin" is a
  // separate, explicit setMemberRole call below (the members table's own
  // role control), not an option exposed in the add-picker itself. Keeps
  // the add flow a single click; a freshly-added member is never
  // accidentally granted admin standing.
  //
  // Upsert, not onConflictDoNothing -- the composite PK is
  // (organizationId, userId), and removeMember below is a soft delete
  // (sets active false rather than deleting the row), so a previously-
  // removed member re-added by email hits that same existing, now-
  // inactive row. onConflictDoNothing would leave it inactive, silently
  // failing to undo the earlier removal; this reactivates it (and resets
  // the role to "standard," same as a brand-new membership -- an old
  // admin grant doesn't survive being removed and re-added). A genuine
  // double-click of Add before the row list refreshes just re-applies the
  // same update, harmlessly.
  addMember: requireOrganizationPermission("members.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db
        .insert(organizationUsers)
        .values({ organizationId: input.organizationId, userId: input.userId, role: "standard", active: true })
        .onConflictDoUpdate({
          target: [organizationUsers.organizationId, organizationUsers.userId],
          set: { active: true, role: "standard" },
        });
      return { organizationId: input.organizationId, userId: input.userId };
    }),

  // "the status gear will allow [an editor] to remove users" -- gated by
  // the Members tab's own update permission (requireOrganizationPermission),
  // same as every other Members-tab write. A member whose org role has
  // been granted members.update (via the Permissions tab) can remove
  // people from their own org now, without needing the global
  // admin.organizations.update override -- the real gap the previous,
  // global-only gate had is closed by this change.
  //
  // Soft delete (active: false), not a real DELETE -- see
  // organization-users-schema.ts's own comment on why the row has to
  // survive removal. assertNotLastActiveAdmin runs first: an org can
  // never be left with zero active admins, this removal included -- no
  // exception even via the global admin.organizations.update override,
  // same "these cannot be removed" invariant the admin role's own grants
  // have (organization-feature-roles.ts's setGranted).
  removeMember: requireOrganizationPermission("members.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await assertNotLastActiveAdmin(input.organizationId, input.userId);

      const [removed] = await db
        .update(organizationUsers)
        .set({ active: false })
        .where(
          and(
            eq(organizationUsers.organizationId, input.organizationId),
            eq(organizationUsers.userId, input.userId),
            eq(organizationUsers.active, true),
          ),
        )
        .returning();

      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That user isn't a member of this organization." });
      }

      return { organizationId: input.organizationId, userId: input.userId };
    }),

  // role is a plain string now, not a fixed z.enum -- organization roles
  // are admin-creatable/deletable at runtime (organization-roles.ts), so
  // this existence check gives the real error a raw FK-constraint
  // violation wouldn't (same precedent admin.ts's setUserRole uses for
  // the global users.role FK). assertNotLastActiveAdmin covers demotion
  // the same way it covers removeMember's removal -- "unset the last
  // active admin" is the same invariant violation either way round.
  setMemberRole: requireOrganizationPermission("members.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1), role: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [role] = await db
        .select({ name: organizationRoles.name })
        .from(organizationRoles)
        .where(and(eq(organizationRoles.organizationId, input.organizationId), eq(organizationRoles.name, input.role)));
      if (!role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role doesn't exist." });
      }

      if (input.role !== "admin") {
        await assertNotLastActiveAdmin(input.organizationId, input.userId);
      }

      const [updated] = await db
        .update(organizationUsers)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationUsers.organizationId, input.organizationId),
            eq(organizationUsers.userId, input.userId),
            eq(organizationUsers.active, true),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That user isn't a member of this organization." });
      }

      return updated;
    }),

  roles: organizationRolesRouter,
  features: organizationFeaturesRouter,
  featureRoles: organizationFeatureRolesRouter,
});
