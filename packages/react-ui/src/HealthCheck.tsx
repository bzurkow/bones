import { useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "backend";

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "http://localhost:3000/trpc" })],
});

export function HealthCheck() {
  const [result, setResult] = useState<string | null>(null);

  async function runCheck() {
    setResult("checking…");
    try {
      const res = await trpc.health.ping.query();
      setResult(JSON.stringify(res));
    } catch (err) {
      setResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div>
      <button onClick={runCheck}>Health check</button>
      {result && <pre>{result}</pre>}
    </div>
  );
}
