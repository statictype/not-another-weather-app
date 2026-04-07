import { useEffect, useState } from "react";

export function App() {
  const [stub, setStub] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/weather?q=London")
      .then((r) => r.json())
      .then((data) => setStub(JSON.stringify(data)))
      .catch((err) => setStub(`error: ${String(err)}`));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Oasis</h1>
      <p>Phase 1 skeleton — Worker + SPA wired up.</p>
      <pre>{stub}</pre>
    </main>
  );
}
