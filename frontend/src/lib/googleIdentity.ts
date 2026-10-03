// Google Identity Services (GIS) loader + button renderer.
//
// The GIS script is only injected when the sign-in modal actually opens and a
// GOOGLE_CLIENT_ID is configured on the backend (served via /api/auth/config),
// so visitors who never sign in never load it. The button returns an ID token
// (JWT) that we POST to /api/auth/google; the backend verifies it against
// Google's certificates, so nothing here is security-relevant.

const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GisButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  locale?: string;
  logo_alignment?: "left" | "center";
}

interface GisIdApi {
  initialize(cfg: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GisButtonOptions): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisIdApi } };
  }
}

let loading: Promise<GisIdApi> | null = null;

export function loadGoogleIdentity(): Promise<GisIdApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GisIdApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const s = existing ?? document.createElement("script");
    const done = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("google identity unavailable"));
    };
    s.addEventListener("load", done, { once: true });
    s.addEventListener(
      "error",
      () => {
        loading = null;
        reject(new Error("google identity failed to load"));
      },
      { once: true },
    );
    if (!existing) {
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  });
  return loading;
}

// Map UI language ids to the locale codes GIS understands for button text.
const GIS_LOCALE: Record<string, string> = {
  en: "en",
  hi: "hi",
  ta: "ta",
  bn: "bn",
  ne: "ne",
  zh: "zh-CN",
  ja: "ja",
  es: "es",
  de: "de",
  pt: "pt-BR",
  fr: "fr",
  ru: "ru",
  ar: "ar",
  fa: "fa",
  he: "iw",
};

export async function renderGoogleButton(
  parent: HTMLElement,
  clientId: string,
  lang: string,
  onCredential: (credential: string) => void,
  width = 320,
): Promise<void> {
  const api = await loadGoogleIdentity();
  api.initialize({
    client_id: clientId,
    callback: (resp) => onCredential(resp.credential),
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
  });
  parent.replaceChildren();
  api.renderButton(parent, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width,
    locale: GIS_LOCALE[lang] ?? "en",
  });
}

export function googleSignOut(): void {
  window.google?.accounts?.id?.disableAutoSelect();
}
