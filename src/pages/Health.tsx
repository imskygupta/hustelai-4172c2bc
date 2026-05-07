import { useEffect, useState } from "react";

/** Lightweight health JSON for /api/health, /api/status, /api/version. */
export default function Health({ kind }: { kind: "health" | "status" | "version" }) {
  const [body, setBody] = useState<string>("{}");

  useEffect(() => {
    const payload =
      kind === "version"
        ? { name: "hustlaiapp", version: import.meta.env.VITE_APP_VERSION || "dev", build: import.meta.env.MODE }
        : kind === "status"
          ? { status: "ok", systems: ["marketing", "workspace", "api", "console", "docs"], ts: new Date().toISOString() }
          : { status: "ok", ts: new Date().toISOString() };
    setBody(JSON.stringify(payload, null, 2));
    document.title = `HustleAI ${kind}`;
  }, [kind]);

  return (
    <pre style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13, background: "#07090d", color: "#a7f3d0", minHeight: "100vh", margin: 0 }}>
      {body}
    </pre>
  );
}