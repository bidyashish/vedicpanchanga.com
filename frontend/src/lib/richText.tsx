import { Fragment, type ReactNode } from "react";

export interface RichLink {
  label: string;
  href: string;
}

// Renders a translated string that contains {0}, {1}, ... placeholders by
// substituting anchor links at those positions. Keeps the whole sentence in a
// single i18n key (so translators see full context) while letting the link
// label itself be a separate, translatable key.
//
// Example:
//   richText(t("k_kundali_p2"), [{ label: t("link_kundali_calc"), href: "/kundali" }])
//   where k_kundali_p2 = "Generate one with our {0}, free."
export function richText(template: string, links: RichLink[]): ReactNode {
  if (links.length === 0) return template;
  const parts = template.split(/(\{\d+\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{(\d+)\}$/);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    const link = links[Number(m[1])];
    if (!link) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a key={i} href={link.href} className="text-saffron hover:text-saffron-dark underline">
        {link.label}
      </a>
    );
  });
}
