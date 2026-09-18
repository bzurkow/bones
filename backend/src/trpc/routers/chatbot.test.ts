import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { chatbotConversations, chatbotMessages, organizationFeatureRoles } from "../../db/schema.js";
import { CHATBOT_FEATURE_KEY } from "../../organization-permissions.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { chatbotRouter } from "./chatbot.js";
import { organizationsRouter } from "./organizations.js";

const createOrgCaller = createCallerFactory(organizationsRouter);
const createCaller = createCallerFactory(chatbotRouter);
const noSessionCtx: Context = { session: null };

async function createTestOrg() {
  const owner = await createTestUser({ role: "owner" });
  const orgCaller = createOrgCaller(contextFor(owner));
  const org = await orgCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
  return { org: org!, owner, orgCaller };
}

// organizations.create seeds the organization_features row for chatbot
// (enabled) but deliberately grants it to nobody, same as production --
// every test that needs an allowed caller has to grant a role explicitly,
// same shape organization-feature-roles.test.ts uses for a custom
// feature. Granting is per (org, role), not per user -- a separate step
// from adding a member, so granting the same role twice (e.g. two
// "standard" members in the same org) doesn't collide on that composite
// primary key.
async function grantChatbotToRole(organizationId: string, role: string) {
  await db
    .insert(organizationFeatureRoles)
    .values({ organizationId, featureKey: CHATBOT_FEATURE_KEY, role, granted: true });
}

async function addMemberWithChatbotAccess(
  orgCaller: ReturnType<typeof createOrgCaller>,
  organizationId: string,
  userId: string,
  role = "standard",
) {
  await orgCaller.addMember({ organizationId, userId });
  if (role !== "standard") {
    await orgCaller.setMemberRole({ organizationId, userId, role });
  }
  await grantChatbotToRole(organizationId, role);
}

beforeEach(async () => {
  await resetDb();
});

describe("chatbot.getHistory", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.getHistory({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a member whose role hasn't been granted chatbot", async () => {
    const { org, orgCaller } = await createTestOrg();
    const member = await createTestUser({ role: "standard" });
    await orgCaller.addMember({ organizationId: org.id, userId: member.id });

    const caller = createCaller(contextFor(member));
    await expect(caller.getHistory({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a non-member entirely, even with chatbot granted to their global role", async () => {
    const { org } = await createTestOrg();
    const outsider = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(outsider));
    await expect(caller.getHistory({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns an empty history for a member with access but no conversation yet", async () => {
    const { org, orgCaller } = await createTestOrg();
    const member = await createTestUser({ role: "standard" });
    await addMemberWithChatbotAccess(orgCaller, org.id, member.id);

    const caller = createCaller(contextFor(member));
    const result = await caller.getHistory({ organizationId: org.id });

    expect(result).toEqual({ conversationId: null, messages: [] });
  });

  it("returns the caller's own most recent conversation, in order", async () => {
    const { org, orgCaller } = await createTestOrg();
    const member = await createTestUser({ role: "standard" });
    await addMemberWithChatbotAccess(orgCaller, org.id, member.id);

    // Explicit, deliberately-ordered updatedAt values -- two inserts back
    // to back could otherwise land in the same millisecond and make the
    // "most recent" ordering this test is actually checking flaky.
    const [older] = await db
      .insert(chatbotConversations)
      .values({
        id: randomUUID(),
        organizationId: org.id,
        userId: member.id,
        title: "older",
        updatedAt: new Date(Date.now() - 1000),
      })
      .returning();
    const [newer] = await db
      .insert(chatbotConversations)
      .values({ id: randomUUID(), organizationId: org.id, userId: member.id, title: "newer" })
      .returning();
    await db.insert(chatbotMessages).values([
      { id: randomUUID(), conversationId: newer!.id, role: "user", content: "hi" },
      { id: randomUUID(), conversationId: newer!.id, role: "assistant", content: "hello there" },
    ]);

    const caller = createCaller(contextFor(member));
    const result = await caller.getHistory({ organizationId: org.id });

    expect(result.conversationId).toBe(newer!.id);
    expect(result.conversationId).not.toBe(older!.id);
    expect(result.messages.map((message) => message.content)).toEqual(["hi", "hello there"]);
  });

  it("never returns another user's conversation in the same org", async () => {
    const { org, orgCaller } = await createTestOrg();
    const memberA = await createTestUser({ role: "standard" });
    const memberB = await createTestUser({ role: "standard" });
    await grantChatbotToRole(org.id, "standard");
    await orgCaller.addMember({ organizationId: org.id, userId: memberA.id });
    await orgCaller.addMember({ organizationId: org.id, userId: memberB.id });

    await db
      .insert(chatbotConversations)
      .values({ id: randomUUID(), organizationId: org.id, userId: memberA.id, title: "A's chat" });

    const callerB = createCaller(contextFor(memberB));
    const result = await callerB.getHistory({ organizationId: org.id });

    expect(result).toEqual({ conversationId: null, messages: [] });
  });
});
