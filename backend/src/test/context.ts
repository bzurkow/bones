import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { Context } from "../trpc/trpc.js";

// Inserts a real user directly via Drizzle -- bypassing better-auth's own
// sign-up, which needs a real OAuth flow -- for tests that need a row to
// act on. Callers only need to override the fields that test actually
// cares about.
export async function createTestUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: "Test User",
      email: `${randomUUID()}@example.test`,
      ...overrides,
    })
    .returning();

  if (!user) throw new Error("createTestUser: insert returned no row");
  return user;
}

// Wraps a user row into the same { session, user } shape createContext()
// builds from a real request's cookies, for use with createCallerFactory.
// The session row itself is fabricated (never persisted) -- nothing under
// test reads anything off it besides what's typed here.
export function contextFor(user: Awaited<ReturnType<typeof createTestUser>>): Context {
  return {
    session: {
      user,
      session: {
        id: randomUUID(),
        token: randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
    },
  };
}
