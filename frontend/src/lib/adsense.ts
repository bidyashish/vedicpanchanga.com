// Google AdSense - Auto ads only.
//
// This file only injects the loader script. Which formats appear, where they
// go and how often they fire is NOT controlled from code: Google reads the
// per-site Auto ads settings from the AdSense dashboard (Ads > By site >
// vedicpanchanga.com > Edit). The expected, low-intrusion configuration is
// recorded in AGENTS.md section 7 ("AdSense Auto ads settings"). Do not add
// manual <ins class="adsbygoogle"> slots, page-level `adsbygoogle.push()`
// configs, or CSS that hides served ads - hidden ads count as invalid
// impressions and put the account at risk.
//
// The script is injected lazily (3 s after mount, on an idle callback) from
// App.tsx and only on monetized routes, so first paint and LCP are never
// blocked by the ad request.
const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5806576477282997";

let injected = false;

export function loadAdSense(): void {
  if (injected) return;
  if (document.querySelector('script[src*="adsbygoogle.js"]')) {
    injected = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = ADSENSE_SRC;
  document.head.appendChild(s);
  injected = true;
}
