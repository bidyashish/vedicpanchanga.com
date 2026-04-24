import type {
  AyanamsaOption,
  CalculateRequest,
  ChartData,
  MuhurtaPurpose,
  MuhurtaRequest,
  MuhurtaResponse,
  NominatimResult,
  PanchangData,
} from "@/types/api";

const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");
const API = `${BASE}/api`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
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
  return (await res.json()) as T;
}

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

export function fetchMuhurtaPurposes(): Promise<MuhurtaPurpose[]> {
  return request<MuhurtaPurpose[]>(`${API}/muhurta-purposes`);
}

export function findMuhurtas(req: MuhurtaRequest): Promise<MuhurtaResponse> {
  return request<MuhurtaResponse>(`${API}/find-muhurta`, {
    method: "POST",
    body: JSON.stringify(req),
  });
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
      headers: { "Accept-Language": "en" },
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
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
