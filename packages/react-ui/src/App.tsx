import { HashRouter, Route, Routes } from "react-router-dom";
import { HealthCheck } from "./HealthCheck";
import { DbHealthCheck } from "./DbHealthCheck";

function Home() {
  return (
    <div>
      Hello World
      {import.meta.env.DEV && (
        <div>
          <HealthCheck />
          <DbHealthCheck />
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
