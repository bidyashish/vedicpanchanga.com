import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;

let scriptInjected = false;
function ensureAdSenseScript() {
  if (scriptInjected || !CLIENT || typeof document === "undefined") return;
  if (document.querySelector('script[data-adsbygoogle="1"]')) {
    scriptInjected = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-adsbygoogle", "1");
  document.head.appendChild(s);
  scriptInjected = true;
}

export type AdSlotName = "header" | "sidebar" | "inline" | "footer";

const SLOT_ENV: Record<AdSlotName, string | undefined> = {
  header: import.meta.env.VITE_ADSENSE_SLOT_HEADER,
  sidebar: import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR,
  inline: import.meta.env.VITE_ADSENSE_SLOT_INLINE,
  footer: import.meta.env.VITE_ADSENSE_SLOT_FOOTER,
};

type Props = {
  slot: AdSlotName;
  className?: string;
  minHeight?: number;
  format?: string;
  responsive?: boolean;
};

export function AdSlot({
  slot,
  className = "",
  minHeight = 90,
  format = "auto",
  responsive = true,
}: Props) {
  const { t } = useI18n();
  const slotId = SLOT_ENV[slot];
  const ref = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!CLIENT || !slotId) return;
    ensureAdSenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* no-op: ad push failed */
    }
  }, [slot, slotId]);

  if (!CLIENT || !slotId) {
    return (
      <div
        aria-hidden="true"
        className={`ad-placeholder ${className}`}
        style={{ minHeight }}
        data-testid={`ad-placeholder-${slot}`}
      >
        {t("advertisement")}
      </div>
    );
  }

  return (
    <div className={className} style={{ minHeight }} data-testid={`ad-slot-${slot}`}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", minHeight }}
        data-ad-client={CLIENT}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
