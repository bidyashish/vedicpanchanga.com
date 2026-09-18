import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { I18nProvider } from "@/i18n";
import { bootstrapTheme } from "@/lib/theme";
import "@/index.css";

bootstrapTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element missing");

createRoot(rootEl).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
