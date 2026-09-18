const GTAG_ID = "G-RNF2N08BQ6";

let injected = false;

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function loadGtag(): void {
  if (injected) return;
  injected = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag("js", new Date());
  gtag("config", GTAG_ID);
}
