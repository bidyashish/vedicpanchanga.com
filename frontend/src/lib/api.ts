import type {
  AyanamsaOption,
  CalculateRequest,
  ChartData,
  MuhurtaPurpose,
  MuhurtaRequest,
  MuhurtaResponse,
  NominatimResult,
  PanchangData,
  TransitsResponse,
  FestivalsResponse,
  AuthConfig,
  AuthUser,
  SavedChart,
  SavedChartInput,
} from "@/types/api";

const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
const API = `${BASE}/api`;

// Thrown for non-2xx responses. `code` is the backend's `detail` string
// (snake_case for the accounts endpoints, e.g. "invalid_credentials") so the UI
// can map it to a localized message; `message` falls back to status text.
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// Account endpoints need the session cookie. Same-origin in production; in dev
// localhost:3121 -> localhost:8001 is same-site so the cookie still flows.
function authed<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`${API}${path}`, { credentials: "include", ...init });
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const fetchAuthConfig = () => authed<AuthConfig>("/auth/config");
export const fetchMe = () => authed<{ user: AuthUser | null }>("/auth/me");
export const signup = (email: string, password: string, name?: string) =>
  authed<{ user: AuthUser }>("/auth/signup", json({ email, password, name: name || undefined }));
export const login = (email: string, password: string) =>
  authed<{ user: AuthUser }>("/auth/login", json({ email, password }));
export const loginWithGoogle = (credential: string) =>
  authed<{ user: AuthUser }>("/auth/google", json({ credential }));
export const logout = () => authed<{ user: null }>("/auth/logout", { method: "POST" });
export const forgotPassword = (email: string) =>
  authed<{ ok: true }>("/auth/forgot-password", json({ email }));
export const resetPassword = (token: string, password: string) =>
  authed<{ user: AuthUser }>("/auth/reset-password", json({ token, password }));
export const changePassword = (currentPassword: string | null, newPassword: string) =>
  authed<{ user: AuthUser }>(
    "/auth/change-password",
    json({ current_password: currentPassword, new_password: newPassword }),
  );
export const deleteAccount = () => authed<{ user: null }>("/auth/account", { method: "DELETE" });

export const listCharts = () => authed<{ charts: SavedChart[]; limit: number }>("/charts");
export const createChart = (input: SavedChartInput) =>
  authed<{ chart: SavedChart }>("/charts", json(input));
export const updateChart = (id: string, patch: Partial<SavedChartInput>) =>
  authed<{ chart: SavedChart }>(`/charts/${id}`, { method: "PUT", body: JSON.stringify(patch) });
export const deleteChart = (id: string) =>
  authed<{ ok: true }>(`/charts/${id}`, { method: "DELETE" });

export const startCheckout = (plan: "monthly" | "yearly") =>
  authed<{ url: string }>("/billing/checkout", json({ plan }));
export const openBillingPortal = () =>
  authed<{ url: string }>("/billing/portal", { method: "POST" });

export function calculateChart(req: CalculateRequest): Promise<ChartData> {
  return request<ChartData>(`${API}/calculate`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function fetchPanchang(params: {
  latitude: number;
  longitude: number;
  date: string;
  timezone?: string | null;
}): Promise<PanchangData> {
  const qs = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    date: params.date,
    detailed: "true",
  });
  if (params.timezone) qs.set("timezone", params.timezone);
  return request<PanchangData>(`${API}/get-panchang?${qs.toString()}`);
}

export function fetchAyanamsaOptions(): Promise<AyanamsaOption[]> {
  return request<AyanamsaOption[]>(`${API}/ayanamsa-options`);
}

export interface SuggestLangResponse {
  country: string;
  lang: string;
}

export function suggestLang(): Promise<SuggestLangResponse> {
  return request<SuggestLangResponse>(`${API}/suggest-lang`);
}

export interface GeoIPResponse {
  latitude: number;
  longitude: number;
  place_name: string;
}

export async function fetchGeoIP(): Promise<GeoIPResponse | null> {
  try {
    const res = await fetch(`${API}/geo-ip`);
    if (!res.ok) return null;
    return (await res.json()) as GeoIPResponse;
  } catch {
    return null;
  }
}

export interface TransitsParams {
  latitude: number;
  longitude: number;
  start_date?: string;
  end_date?: string;
  timezone?: string | null;
  include_signs?: boolean;
  include_nakshatras?: boolean;
  include_retrograde?: boolean;
  include_moon?: boolean;
  moon_nakshatras?: boolean;
}

export function fetchTransits(params: TransitsParams): Promise<TransitsResponse> {
  const qs = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
  });
  if (params.start_date) qs.set("start_date", params.start_date);
  if (params.end_date) qs.set("end_date", params.end_date);
  if (params.timezone) qs.set("timezone", params.timezone);
  if (params.include_signs === false) qs.set("include_signs", "false");
  if (params.include_nakshatras === false) qs.set("include_nakshatras", "false");
  if (params.include_retrograde === false) qs.set("include_retrograde", "false");
  if (params.include_moon) qs.set("include_moon", "true");
  if (params.moon_nakshatras) qs.set("moon_nakshatras", "true");
  return request<TransitsResponse>(`${API}/transits?${qs.toString()}`);
}

export interface FestivalsParams {
  year: number;
  latitude: number;
  longitude: number;
  timezone?: string | null;
}

export function fetchFestivals(params: FestivalsParams): Promise<FestivalsResponse> {
  const qs = new URLSearchParams({
    year: String(params.year),
    latitude: String(params.latitude),
    longitude: String(params.longitude),
  });
  if (params.timezone) qs.set("timezone", params.timezone);
  return request<FestivalsResponse>(`${API}/festivals?${qs.toString()}`);
}

export function fetchMuhurtaPurposes(): Promise<MuhurtaPurpose[]> {
  return request<MuhurtaPurpose[]>(`${API}/muhurta-purposes`);
}

export function findMuhurtas(req: MuhurtaRequest): Promise<MuhurtaResponse> {
  return request<MuhurtaResponse>(`${API}/find-muhurta`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface PrintPdfRequest {
  name?: string;
  sex?: string;
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  place_name?: string;
  ayanamsa?: string;
  chart_style?: "north" | "south";
  lang:
    | "en"
    | "hi"
    | "ta"
    | "bn"
    | "ne"
    | "zh"
    | "ja"
    | "es"
    | "de"
    | "pt"
    | "fr"
    | "ru"
    | "ar"
    | "fa"
    | "he";
}

export async function printPdf(req: PrintPdfRequest): Promise<Blob> {
  const res = await fetch(`${API}/print-pdf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return await res.blob();
}

function activeAcceptLanguage(): string {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.lang || "en";
  // Nominatim honours BCP-47; en fallback keeps results readable for everyone.
  return `${lang},en;q=0.7`;
}

export async function geocode(query: string, limit = 6): Promise<NominatimResult[]> {
  if (query.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");
  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": activeAcceptLanguage() },
    });
    if (!res.ok) return [];
    return (await res.json()) as NominatimResult[];
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": activeAcceptLanguage() },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
