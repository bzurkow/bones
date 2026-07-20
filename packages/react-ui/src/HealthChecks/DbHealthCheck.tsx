import { useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "backend";
import { BACKEND_URL } from "../config";

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${BACKEND_URL}/trpc` })],
});

export function DbHealthCheck() {
  const [result, setResult] = useState<string | null>(null);

  async function runCheck() {
    setResult("checking…");
    try {
      const res = await trpc.db.ping.query();
      setResult(JSON.stringify(res));
    } catch (err) {
      setResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div>
      <button onClick={runCheck}>DB health check</button>
      {result && <pre>{result}</pre>}
    </div>
  );
}
