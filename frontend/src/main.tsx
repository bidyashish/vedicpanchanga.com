import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/auth";
import { bootstrapTheme } from "@/lib/theme";
import "@/index.css";

bootstrapTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element missing");

createRoot(rootEl).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
