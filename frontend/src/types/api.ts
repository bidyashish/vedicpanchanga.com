export type AyanamsaId =
  | "lahiri"
  | "kp_new"
  | "kp_old"
  | "raman"
  | "kp_khullar"
  | "sayan"
  | "manoj";

export interface CalculateRequest {
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  place_name?: string | null;
  ayanamsa?: AyanamsaId;
}

export interface Planet {
  name: string;
  abbr: string;
  longitude: number;
  combust?: boolean;
  sign_id: number;
  sign: string;
  sign_lord: string;
  degree_in_sign: number;
  dms: string;
  nakshatra: string;
  nakshatra_pada: number;
  nakshatra_lord: string;
  retrograde: boolean;
  house?: number;
  exalted?: boolean;
  debilitated?: boolean;
  own_sign?: boolean;
  moolatrikona?: boolean;
  vargottama?: boolean;
  digbala?: boolean;
  pushkara_bhaga?: boolean;
  pushkara_navamsa?: boolean;
  neecha_bhanga?: boolean;
  parivartana?: boolean;
  parivartana_with?: string | null;
  mrityu_bhaga?: boolean;
  gandanta?: boolean;
  graha_yuddha?: boolean;
  graha_yuddha_with?: string | null;
}

export interface BirthSummary {
  local_time: string;
  utc_time: string;
  timezone: string;
  latitude: number;
  longitude: number;
  julian_day: number;
  ayanamsa: number;
  ayanamsa_id: string;
  ayanamsa_label: string;
}

export type HouseMap = Record<number, string[]>;

export interface VargaChart {
  chart: HouseMap;
  asc_sign: number;
  name: string;
  subtitle?: string;
  division: number;
  planet_degrees: Record<string, number>;
}

export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
  years: number;
}

export interface AntardashaPeriod {
  lord: string;
  start: string;
  end: string;
  years: number;
}

export interface Mahadasha extends DashaPeriod {
  antardashas: AntardashaPeriod[];
}

export interface Ashtakavarga {
  bav: Record<string, number[]>;
  sav: number[];
}

export interface Karaka {
  rank: number;
  abbr: string;
  title: string;
  planet: string;
  planet_abbr: string;
  sign: string;
  sign_id: number;
  degree_in_sign: number;
  dms: string;
}

export interface JaiminiChart {
  lagna_sign: number;
  chart: HouseMap;
}

export interface AspectDetail {
  planet: string;
  planet_abbr: string;
  from_sign: number;
  from_house: number;
  to_sign: number;
  to_house: number;
  offset: number;
  aspect_type: "standard" | "special";
  strength: number;
  benefic: boolean;
}

export interface PlanetAspects {
  name: string;
  abbr: string;
  house: number;
  benefic: boolean;
  retrograde: boolean;
  combust: boolean;
  aspected_houses: number[];
  details: AspectDetail[];
}

export interface MutualAspect {
  planet1: string;
  planet2: string;
}

export interface DrishtiData {
  aspects: AspectDetail[];
  by_planet: Record<string, PlanetAspects>;
  mutual: MutualAspect[];
}

export type TransitEventType = "sign_ingress" | "nakshatra_ingress" | "retrograde" | "direct";

export interface TransitEvent {
  planet: string;
  abbr: string;
  event_type: TransitEventType;
  date_utc: string;
  date_local: string;
  // sign_ingress fields
  from_sign?: string;
  from_sign_id?: number;
  to_sign?: string;
  to_sign_id?: number;
  // nakshatra_ingress fields
  from_nakshatra?: string;
  from_nakshatra_id?: number;
  to_nakshatra?: string;
  to_nakshatra_id?: number;
  // retrograde / direct fields
  in_sign?: string;
  in_sign_id?: number;
  in_nakshatra?: string;
  in_nakshatra_id?: number;
}

export interface TransitsResponse {
  start_date: string;
  end_date: string;
  timezone: string;
  count: number;
  events: TransitEvent[];
}

export type FriendshipCode = "GF" | "F" | "N" | "E" | "GE" | "";

export interface Friendships {
  planets: string[];
  natural: Record<string, Record<string, FriendshipCode>>;
  temporal: Record<string, Record<string, FriendshipCode>>;
  composite: Record<string, Record<string, FriendshipCode>>;
  labels: Record<string, string>;
}

export interface ChartData {
  birth: BirthSummary;
  ascendant: Planet;
  planets_data: Planet[];
  d1_chart: HouseMap;
  d2_chart: HouseMap;
  d9_chart: HouseMap;
  d1_asc_sign: number;
  d2_asc_sign: number;
  d9_asc_sign: number;
  vargas: Record<string, VargaChart>;
  varga_order: number[];
  dasha: DashaPeriod[];
  dasha_antar?: Mahadasha[];
  ashtakavarga: Ashtakavarga;
  karakas?: Karaka[];
  karakamsa?: JaiminiChart;
  swamsa?: JaiminiChart;
  friendships?: Friendships;
  drishti?: DrishtiData;
}

export interface AyanamsaOption {
  id: string;
  label: string;
}

export interface MuhurtaPurpose {
  id: string;
  label: string;
}

export interface MuhurtaRequest {
  purpose: string;
  start_date: string;
  end_date: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  birth_rashi_id: number | null;
  birth_nakshatra_id: number | null;
  min_score: number;
  limit: number;
}

export interface MuhurtaWindow {
  start: string;
  end: string;
}

export interface MuhurtaResult {
  date: string;
  weekday: string;
  score: number;
  tithi: string;
  paksha: string;
  nakshatra: string;
  moon_rashi: string;
  sunrise: string;
  sunset: string;
  abhijit?: MuhurtaWindow;
  brahma_muhurta?: MuhurtaWindow;
  pratah_sandhya?: MuhurtaWindow;
  vijay_muhurta?: MuhurtaWindow;
  godhuli_muhurta?: MuhurtaWindow;
  sayahna_sandhya?: MuhurtaWindow;
  nishita_muhurta?: MuhurtaWindow;
  amrit_kalam?: AuspiciousWindow[];
  sarvartha_siddhi_yoga?: AuspiciousWindow[];
  amrita_siddhi_yoga?: AuspiciousWindow[];
  rahu_kalam?: MuhurtaWindow;
  reasons: string[];
  cautions: string[];
}

export interface MuhurtaResponse {
  purpose_label: string;
  date_range: { days_scanned: number };
  total_matches: number;
  location?: { timezone?: string };
  filter: { native_rashi?: string; native_nakshatra?: string };
  muhurtas: MuhurtaResult[];
}

export interface TransitItem {
  name?: string;
  rashi?: string;
  starts_at?: string;
  ends_at?: string;
  end?: string;
  is_bhadra?: boolean;
  nakshatra?: string;
  pada?: number;
}

export interface AuspiciousWindow extends MuhurtaWindow {
  nakshatra?: string;
}

export interface LabelledSegment {
  name: string;
  start: string;
  end: string;
  auspicious: boolean;
}

export interface NallaNeramWindow {
  start: string;
  end: string;
  planet: string;
}

export interface PanchangData {
  date: string;
  location: { timezone: string };
  sun_moon: {
    sunrise: string;
    sunset: string;
    moonrise?: string;
    moonset?: string;
    dinaman_hours?: number;
    ratriman_hours?: number;
    madhyahna: string;
  };
  panchang: {
    tithi_sequence: TransitItem[];
    nakshatra_sequence: TransitItem[];
    yoga_sequence: TransitItem[];
    karana_sequence: TransitItem[];
    paksha: string;
  };
  vara: { sanskrit: string; english: string };
  lunar_month: {
    vikram_samvat: number | string;
    samvatsara_vikram: string;
    shaka_samvat: number | string;
    samvatsara_shaka: string;
    gujarati_samvat: number | string;
    chandramasa_purnimanta: string;
    chandramasa_amanta: string;
    nirayana_solar_month: string;
    pravishte_day: string | number;
    paksha: string;
  };
  rashi_nakshatra: {
    moonsign_sequence: TransitItem[];
    moon_nakshatra_padas: TransitItem[];
    sunsign: { rashi: string };
    surya_nakshatra: { name: string; pada: number; ends_at: string };
  };
  ritu_ayana: {
    drik_ritu: string;
    vedic_ritu: string;
    drik_ayana: string;
    vedic_ayana: string;
  };
  auspicious_timings: {
    brahma_muhurta?: MuhurtaWindow;
    pratah_sandhya?: MuhurtaWindow;
    abhijit?: MuhurtaWindow;
    vijay_muhurta?: MuhurtaWindow;
    godhuli_muhurta?: MuhurtaWindow;
    sayahna_sandhya?: MuhurtaWindow;
    nishita_muhurta?: MuhurtaWindow;
    amrit_kalam?: AuspiciousWindow[];
    sarvartha_siddhi_yoga?: AuspiciousWindow[];
    amrita_siddhi_yoga?: AuspiciousWindow[];
  };
  inauspicious_timings: {
    rahu_kalam?: MuhurtaWindow;
    yamaganda?: MuhurtaWindow;
    gulika_kalam?: MuhurtaWindow;
    dur_muhurtam: (MuhurtaWindow & { muhurta_number: number })[];
    bhadra: MuhurtaWindow[];
    varjyam?: AuspiciousWindow[];
  };
  udaya_lagna: { rashi: string; start: string; end: string }[];
  chandrabalam: { good_rashis: { rashi: string }[] };
  tarabalam: { good_nakshatras: { nakshatra: string }[] };
  shool_vasa: { disha_shool: string; rahu_vasa: string; chandra_vasa: string };
  yogas_extra?: {
    ganda_mula?: { nakshatra: string; ends_at: string } | null;
    ravi_yoga?: { start: string; end: string } | null;
  };
  tyajyam?: {
    nakshatra_tyajyam: (MuhurtaWindow & { nakshatra: string })[];
    tithi_tyajyam: (MuhurtaWindow & { tithi: string })[];
    vara_tyajyam?: MuhurtaWindow;
    lagna_tyajyam: (MuhurtaWindow & { sign: string; position: string })[];
    amritadi_yogam: (MuhurtaWindow & { nakshatra: string; yogam: string })[];
  };
  gowri_panchang?: {
    day: LabelledSegment[];
    night: LabelledSegment[];
  };
  hora?: {
    day: LabelledSegment[];
    night: LabelledSegment[];
  };
  nalla_neram?: NallaNeramWindow[];
  tamil_calendar?: {
    week_day: { en: string; ta: string };
    tamil_date: number;
    tamil_month: { id: number; en: string; ta: string; rashi: string };
    tamil_year: { id: number; name_en: string; name_ta: string; gregorian_start_year: number };
    month_start_iso: string;
  };
  calendars: {
    kali_year: number;
    kali_ahargana_days: number;
    julian_day: number;
    modified_julian_day: number;
    rata_die: number;
    ayanamsha_lahiri: number;
    national_civil_date: { month: string; day: number; shaka_year: number };
    national_nirayana_date: { month: string; day: number; shaka_year: number };
  };
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface LocationChoice {
  place_name: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}
