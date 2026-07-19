import { HashRouter, Route, Routes } from "react-router-dom";
import { HealthCheck } from "./HealthCheck";
import { DbHealthCheck } from "./DbHealthCheck";
import { Login } from "./Login";

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
      <Login />
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
