import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// SPA redirect handler: if 404.html redirected here with ?redirect= param
const params = new URLSearchParams(window.location.search);
const redirectPath = params.get("redirect");
if (redirectPath && redirectPath !== "/") {
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")!).render(<App />);
