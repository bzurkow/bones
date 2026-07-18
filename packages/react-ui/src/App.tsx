import { HealthCheck } from "./HealthCheck";

export function App() {
  return (
    <div>
      Hello World
      {import.meta.env.DEV && <HealthCheck />}
    </div>
  );
}
