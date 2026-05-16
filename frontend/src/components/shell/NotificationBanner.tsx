import { useState, useEffect } from "react";
import notifications from "@/notifications.json";

interface Notice {
  id: string;
  message: string;
  linkText?: string;
  linkUrl?: string;
  showUntil: string;
  newVisitorOnly?: boolean;
}

const STORAGE_PREFIX = "vp_notif_dismissed_";
const VISITED_KEY = "vp_visited";

function ls(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* private mode */
  }
}

function getActiveNotice(): Notice | null {
  const now = new Date().toISOString().slice(0, 10);
  for (const n of notifications as Notice[]) {
    if (n.showUntil < now) continue;
    if (ls(STORAGE_PREFIX + n.id)) continue;
    if (n.newVisitorOnly && ls(VISITED_KEY)) continue;
    return n;
  }
  return null;
}

export function NotificationBanner() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setNotice(getActiveNotice());
    lsSet(VISITED_KEY, "1");
  }, []);

  if (!notice) return null;

  const dismiss = () => {
    lsSet(STORAGE_PREFIX + notice.id, "1");
    setNotice(getActiveNotice());
  };

  const isExternal = notice.linkUrl?.startsWith("http");

  return (
    <div className="bg-saffron/90 text-white text-center text-xs sm:text-sm py-1.5 pl-4 pr-9 flex items-center justify-center gap-2 relative">
      <span>
        {notice.message}
        {notice.linkText && notice.linkUrl && (
          <>
            {" "}
            <a
              href={notice.linkUrl}
              {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="underline font-semibold text-white hover:text-parchment-100"
            >
              {notice.linkText}
            </a>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </button>
    </div>
  );
}
