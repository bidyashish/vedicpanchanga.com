/**
 * Visual identity for festival cards on /festivals: an emoji glyph plus a
 * two-stop gradient. Hero cards paint the gradient behind white text, so both
 * stops must stay saturated / mid-dark (no pastels). Unknown ids fall back to
 * a neutral saffron theme; ekadashi_* and *_shraddha share one theme each.
 */
export interface FestivalTheme {
  glyph: string;
  from: string;
  to: string;
}

const DURGA: FestivalTheme = { glyph: "🔱", from: "#7f0a2e", to: "#e0332f" };
const NAVRATRI: FestivalTheme = { glyph: "🔱", from: "#9c1b14", to: "#ef7d15" };
const TEEJ: FestivalTheme = { glyph: "🪷", from: "#1b7a3d", to: "#79b32a" };
const SHRADDHA: FestivalTheme = { glyph: "🕯️", from: "#4e342e", to: "#8d6e63" };
const EKADASHI: FestivalTheme = { glyph: "🙏", from: "#0f6a5f", to: "#3fa796" };
const DEFAULT: FestivalTheme = { glyph: "✨", from: "#b9531a", to: "#e08a2a" };

const THEMES: Record<string, FestivalTheme> = {
  holi: { glyph: "🎨", from: "#d81b60", to: "#f9a825" },
  holika_dahan: { glyph: "🔥", from: "#bf360c", to: "#f57c00" },
  diwali: { glyph: "🪔", from: "#9a5b00", to: "#f39c12" },
  dhanteras: { glyph: "🪙", from: "#8a6d00", to: "#d4a017" },
  narak_chaturdashi: { glyph: "🪔", from: "#4a148c", to: "#e65100" },
  kali_puja: { glyph: "🌑", from: "#1c0b1f", to: "#8e0e3c" },
  govardhan_puja: { glyph: "🐄", from: "#2e7d32", to: "#9e9d24" },
  bhaiya_dooj: { glyph: "🤝", from: "#ad1457", to: "#f4511e" },
  chhath_puja: { glyph: "🌅", from: "#e64a19", to: "#f9a825" },
  kartika_purnima: { glyph: "🪔", from: "#6d4c41", to: "#d4a017" },
  tulasi_vivah: { glyph: "🌿", from: "#1b5e20", to: "#66bb6a" },
  chaitra_navratri: NAVRATRI,
  navratri_begins: NAVRATRI,
  sharad_navratri: NAVRATRI,
  saraswati_avahan: { glyph: "📿", from: "#ef6c00", to: "#f9a825" },
  saraswati_puja: { glyph: "📿", from: "#ef6c00", to: "#f9a825" },
  maha_shashthi: DURGA,
  maha_saptami: DURGA,
  durga_ashtami: DURGA,
  maha_navami: DURGA,
  durga_puja: DURGA,
  vijayadashami: { glyph: "🏹", from: "#b71c1c", to: "#f57f17" },
  rama_navami: { glyph: "🏹", from: "#e65100", to: "#f9a825" },
  sita_navami: { glyph: "🏹", from: "#c2185b", to: "#f06292" },
  hanuman_jayanti: { glyph: "🚩", from: "#d84315", to: "#ff7043" },
  krishna_janmashtami: { glyph: "🦚", from: "#1a237e", to: "#0097a7" },
  radha_ashtami: { glyph: "🌸", from: "#6a1b9a", to: "#ec407a" },
  balarama_jayanti: { glyph: "🌾", from: "#283593", to: "#5c6bc0" },
  ganesh_chaturthi: { glyph: "🐘", from: "#c62828", to: "#f9a825" },
  anant_chaturdashi: { glyph: "🐘", from: "#1565c0", to: "#26a69a" },
  maha_shivaratri: { glyph: "🕉️", from: "#263238", to: "#607d8b" },
  raksha_bandhan: { glyph: "🎀", from: "#c2185b", to: "#f06292" },
  karwa_chauth: { glyph: "🌙", from: "#4a148c", to: "#d81b60" },
  ahoi_ashtami: { glyph: "🌙", from: "#37474f", to: "#78909c" },
  pongal: { glyph: "🪁", from: "#e65100", to: "#f9a825" },
  sankranti: { glyph: "☀️", from: "#f57f17", to: "#fbc02d" },
  solar_new_year: { glyph: "🎊", from: "#f57f17", to: "#43a047" },
  hindu_new_year: { glyph: "🎊", from: "#f57f17", to: "#43a047" },
  onam: { glyph: "🌸", from: "#2e7d32", to: "#fbc02d" },
  vasant_panchami: { glyph: "🪷", from: "#f9a825", to: "#ef6c00" },
  akshaya_tritiya: { glyph: "✨", from: "#b8860b", to: "#e65100" },
  guru_purnima: { glyph: "🌕", from: "#5d4037", to: "#ff9800" },
  buddha_purnima: { glyph: "☸️", from: "#ef6c00", to: "#ffb300" },
  nag_panchami: { glyph: "🐍", from: "#33691e", to: "#8bc34a" },
  hariyali_teej: TEEJ,
  kajari_teej: TEEJ,
  hartalika_teej: TEEJ,
  jagannath_rathyatra: { glyph: "🛕", from: "#c62828", to: "#fbc02d" },
  ganga_dussehra: { glyph: "🌊", from: "#0277bd", to: "#4fc3f7" },
  ganga_saptami: { glyph: "🌊", from: "#0277bd", to: "#4fc3f7" },
  narasimha_jayanti: { glyph: "🦁", from: "#bf360c", to: "#ffa000" },
  gita_jayanti: { glyph: "📖", from: "#283593", to: "#7986cb" },
  vishwakarma_puja: { glyph: "⚙️", from: "#37474f", to: "#ff8f00" },
  surya_grahan: { glyph: "🌘", from: "#212121", to: "#616161" },
  chandra_grahan: { glyph: "🌒", from: "#1a237e", to: "#455a64" },
  purnima: { glyph: "🌕", from: "#5d4037", to: "#a1887f" },
  amavasya: { glyph: "🌑", from: "#263238", to: "#546e7a" },
  somavati_amavasya: { glyph: "🌑", from: "#263238", to: "#546e7a" },
  mauni_amavasya: { glyph: "🌑", from: "#263238", to: "#546e7a" },
  adhika_masa: { glyph: "📿", from: "#4527a0", to: "#7e57c2" },
  chaturmas: { glyph: "🐚", from: "#01579b", to: "#0288d1" },
  pitru_paksha: SHRADDHA,
  purnima_shraddha: SHRADDHA,
  sarva_pitru_amavasya: SHRADDHA,
  maha_bharani: SHRADDHA,
  magha_shraddha: SHRADDHA,
};

export function festivalTheme(id: string): FestivalTheme {
  const hit = THEMES[id];
  if (hit) return hit;
  if (id.startsWith("ekadashi_")) return EKADASHI;
  if (id.endsWith("_shraddha")) return SHRADDHA;
  return DEFAULT;
}
