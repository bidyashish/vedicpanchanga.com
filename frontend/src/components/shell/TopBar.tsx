import { useEffect, useState } from "react";
import { MandalaMark } from "@/components/common/MandalaMark";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useI18n } from "@/i18n";
import type { View } from "@/App";

export function TopBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: { id: View; label: string; href: string }[] = [
    { id: "kundali", label: t("nav_kundali"), href: "/" },
    { id: "panchang", label: t("nav_panchang"), href: "/panchang" },
    { id: "muhurta", label: t("nav_muhurta"), href: "/muhurta" },
  ];

  // Close mobile drawer on Esc or when viewport grows past mobile.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    const onResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const pickTab = (id: View) => {
    setView(id);
    setDrawerOpen(false);
  };

  // Real anchor click → keep SPA navigation but only if it's a plain left-click
  // without modifier keys. Cmd/Ctrl/middle-click still open in a new tab because
  // we let the browser handle them.
  const onNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: View) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    pickTab(id);
  };

  return (
    <header data-testid="top-bar" className="sticky top-0 z-30 glass border-b border-parchment-200">
      <div className="max-w-screen-3xl mx-auto px-3 sm:px-5 lg:px-7 h-12 sm:h-14 flex items-center gap-2 sm:gap-6">
        {/* Brand */}
        <a
          href="/"
          data-testid="brand-logo"
          className="flex items-center gap-2 shrink-0 no-underline text-ink-soft"
          aria-label="VedicPanchanga home"
        >
          <MandalaMark size={26} />
          <div className="leading-tight hidden sm:block">
            <div className="font-serif text-lead lg:text-base text-ink font-semibold tracking-tight">
              {t("brand_name")}
            </div>
          </div>
          {/* Mobile: short brand */}
          <div className="font-serif text-body text-ink font-semibold tracking-tight sm:hidden">
            VP
          </div>
        </a>

        {/* Desktop nav (md+) */}
        <nav
          role="tablist"
          data-testid="main-nav"
          className="hidden md:flex flex-1 justify-center gap-0.5"
        >
          {tabs.map((tb) => {
            const active = view === tb.id;
            return (
              <a
                key={tb.id}
                href={tb.href}
                data-testid={`nav-${tb.id}`}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                onClick={(e) => onNavClick(e, tb.id)}
                className={`relative whitespace-nowrap px-3 py-1.5 text-meta font-medium rounded-sm no-underline transition-colors ${
                  active ? "text-saffron" : "text-ink-soft hover:text-ink hover:bg-parchment-100"
                }`}
              >
                {tb.label}
                {active && (
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] h-0.5 w-full rounded-full bg-saffron" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Spacer pushing right-side controls on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />
          {/* Mobile menu button */}
          <button
            type="button"
            data-testid="mobile-menu-btn"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-sm border border-parchment-200 bg-parchment-50 text-ink hover:border-saffron hover:text-saffron focus:outline-hidden focus:ring-2 focus:ring-saffron/30 transition-colors"
          >
            {drawerOpen ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-12 sm:top-14 bg-ink/30 z-20"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-nav-drawer"
            role="navigation"
            aria-label="Primary"
            className="md:hidden absolute left-0 right-0 top-12 sm:top-14 z-30 bg-parchment-50 border-b border-parchment-200 shadow-card"
          >
            <ul className="px-3 py-3 space-y-1">
              {tabs.map((tb) => {
                const active = view === tb.id;
                return (
                  <li key={tb.id}>
                    <a
                      href={tb.href}
                      data-testid={`mnav-${tb.id}`}
                      onClick={(e) => onNavClick(e, tb.id)}
                      aria-current={active ? "page" : undefined}
                      className={`w-full flex items-center justify-between text-start px-4 py-3 rounded-md text-meta font-semibold no-underline transition-colors ${
                        active ? "bg-saffron/10 text-saffron" : "text-ink hover:bg-parchment-100"
                      }`}
                    >
                      <span>{tb.label}</span>
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-saffron" aria-hidden="true" />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
