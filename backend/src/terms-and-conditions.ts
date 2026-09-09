import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { termsAndConditions, userTermsAndConditions } from "./db/schema.js";

// Shared by auth.ts's customSession plugin (see hasAcceptedTermsAndConditions
// on the session response) -- kept as its own module rather than living in
// trpc/routers/terms-and-conditions.ts specifically so auth.ts can import it
// without creating a cycle through trpc.ts (which itself imports auth.ts).
export async function getHasAcceptedTermsAndConditions(userId: string): Promise<boolean | null> {
  const [active] = await db
    .select({ id: termsAndConditions.id })
    .from(termsAndConditions)
    .where(eq(termsAndConditions.active, true))
    .limit(1);

  // Nothing active -- null, not a pending gate but also not "accepted";
  // there's simply nothing to have an opinion about yet.
  if (!active) return null;

  const [acceptance] = await db
    .select({ accepted: userTermsAndConditions.accepted })
    .from(userTermsAndConditions)
    .where(and(eq(userTermsAndConditions.userId, userId), eq(userTermsAndConditions.termsAndConditionsId, active.id)))
    .limit(1);

  return acceptance?.accepted ?? false;
}
