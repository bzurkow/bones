import { useEffect, useState } from "react";
import type { AuthProtocolName } from "backend";
import { trpc } from "../trpc";

// Login.tsx and SignUp.tsx both need this before rendering their sign-in
// UI -- pulled into one hook rather than duplicating the fetch in each
// page. undefined means "still loading" -- both pages treat that as "don't
// render any auth method yet" rather than guessing, since briefly showing
// a since-disabled method is worse than a brief blank beat.
export function useAuthProtocols(): Partial<Record<AuthProtocolName, boolean>> | undefined {
  const [protocols, setProtocols] = useState<Partial<Record<AuthProtocolName, boolean>> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void trpc.authProtocols.list.query().then((rows) => {
      if (cancelled) return;
      setProtocols(Object.fromEntries(rows.map((row) => [row.name, row.enabled])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return protocols;
}
