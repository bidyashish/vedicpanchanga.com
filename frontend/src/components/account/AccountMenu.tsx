import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth";
import type { View } from "@/App";

// TopBar control: "Sign in" when anonymous, avatar + dropdown when signed in.
// Renders nothing while the session is loading or when accounts are disabled
// on the backend, so the header is byte-identical to the pre-accounts layout
// in that case.
export function AccountMenu({ setView }: { setView: (v: View) => void }) {
  const { t } = useI18n();
  const { status, enabled, user, openAuthModal, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!enabled || status === "loading") return null;

  if (!user) {
    return (
      <button
        type="button"
        data-testid="account-signin"
        onClick={() => openAuthModal("signin")}
        className="hidden sm:inline-flex items-center h-8 px-3 rounded-sm border border-parchment-200 bg-parchment-50 text-meta font-medium text-ink hover:border-saffron hover:text-saffron focus:outline-hidden focus:ring-2 focus:ring-saffron/30 transition-colors"
      >
        {t("auth_sign_in")}
      </button>
    );
  }

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="account-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav_account")}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border overflow-hidden transition-colors focus:outline-hidden focus:ring-2 focus:ring-saffron/30 ${
          user.is_premium ? "border-saffron" : "border-parchment-200"
        } bg-parchment-50 text-ink hover:border-saffron`}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-meta font-semibold">{initial}</span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          data-testid="account-menu"
          className="absolute end-0 top-full mt-2.5 w-60 rounded-md border border-parchment-200 bg-parchment-50 shadow-card z-40 py-1"
        >
          <div className="px-3 py-2 border-b border-parchment-200">
            <div className="text-meta text-ink font-semibold truncate">
              {user.name || user.email}
            </div>
            {user.name && (
              <div className="text-mini text-ink-soft truncate" dir="ltr">
                {user.email}
              </div>
            )}
            <div
              className={`text-mini mt-0.5 ${user.is_premium ? "text-saffron font-semibold" : "text-ink-soft"}`}
            >
              {user.is_premium ? t("acct_plan_premium") : t("acct_plan_free")}
            </div>
          </div>
          <a
            href="/account"
            role="menuitem"
            data-testid="account-menu-account"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setOpen(false);
              setView("account");
            }}
            className="block px-3 py-2 text-meta text-ink no-underline hover:bg-parchment-100"
          >
            {t("nav_account")}
          </a>
          <button
            type="button"
            role="menuitem"
            data-testid="account-menu-signout"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full text-start px-3 py-2 text-meta text-ink hover:bg-parchment-100"
          >
            {t("auth_sign_out")}
          </button>
        </div>
      )}
    </div>
  );
}
