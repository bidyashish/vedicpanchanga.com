type SeoOptions = {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function applySeo({ title, description, canonical, noindex }: SeoOptions) {
  document.title = title;
  setMeta("description", description);
  setMeta("og:title", title, "property");
  setMeta("og:description", description, "property");
  setMeta("og:url", canonical, "property");
  setMeta("twitter:title", title);
  setMeta("twitter:description", description);
  setLink("canonical", canonical);
  setMeta("robots", noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1");
}
