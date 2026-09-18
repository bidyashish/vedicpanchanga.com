import type { ReactNode } from "react";
import { useEffect } from "react";
import { applySeo } from "@/lib/seo";

interface CrumbLink {
  label: string;
  href: string;
}

interface Props {
  title: string;
  intro: string;
  seo: { title: string; description: string; canonical: string; keywords?: string };
  /** Extra breadcrumb links shown after Home (e.g. a related tool page). */
  crumbs?: CrumbLink[];
  children: ReactNode;
}

// Shared shell for the long-form /learn/* article pages. Mirrors the layout
// conventions used by PrivacyPage (max-w-3xl, centered header, breadcrumb nav)
// so the content pages feel native to the rest of the site.
export function ArticleLayout({ title, intro, seo, crumbs, children }: Props) {
  useEffect(() => {
    applySeo(seo);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [seo]);

  return (
    <article className="py-6 space-y-6 max-w-3xl mx-auto">
      <header className="text-center space-y-2">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-meta text-ink-soft leading-relaxed">{intro}</p>
        <nav className="pt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-mini">
          <a href="/" className="text-saffron hover:text-saffron-dark">
            Home
          </a>
          {crumbs?.map((c) => (
            <span key={c.href} className="inline-flex items-center gap-3">
              <span aria-hidden="true" className="text-ink-soft">
                ·
              </span>
              <a href={c.href} className="text-saffron hover:text-saffron-dark">
                {c.label}
              </a>
            </span>
          ))}
        </nav>
      </header>
      <div className="space-y-6">{children}</div>
    </article>
  );
}
