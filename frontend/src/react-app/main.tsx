import "@/react-app/lib/polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";
import EnvGuard from "@/react-app/components/EnvGuard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EnvGuard>
      <App />
    </EnvGuard>
  </StrictMode>
);
