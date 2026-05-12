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
