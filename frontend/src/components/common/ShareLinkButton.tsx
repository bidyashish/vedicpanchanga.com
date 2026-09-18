import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

interface Props {
  url: string;
  testId?: string;
  className?: string;
}

type Status = "idle" | "copied" | "failed";

export function ShareLinkButton({ url, testId, className }: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const id = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [status]);

  const onCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  const label =
    status === "copied"
      ? t("share_link_copied")
      : status === "failed"
        ? t("share_link_failed")
        : t("share_link_copy");

  return (
    <button
      type="button"
      data-testid={testId ?? "share-link-btn"}
      onClick={onCopy}
      className={className ?? "btn-ghost text-mini"}
      aria-label={t("share_link_copy")}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
