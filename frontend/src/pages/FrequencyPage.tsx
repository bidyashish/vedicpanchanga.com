import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";

type Waveform = "sine" | "square" | "sawtooth" | "triangle";
type NoiseType = "white" | "pink" | "brown";

const MOST_POPULAR: { hz: number; labelKey: string | null }[] = [
  { hz: 432, labelKey: null },
  { hz: 528, labelKey: null },
  { hz: 288, labelKey: "freq_sacral" },
];

const VEDIC: { hz: number; labelKey: string }[] = [
  { hz: 136.1, labelKey: "freq_om" },
  { hz: 110, labelKey: "freq_temple" },
  { hz: 40, labelKey: "freq_gamma" },
];

const NAVAGRAHA: { hz: number; planet: string }[] = [
  { hz: 126.22, planet: "Sun" },
  { hz: 210.42, planet: "Moon" },
  { hz: 144.72, planet: "Mars" },
  { hz: 141.27, planet: "Mercury" },
  { hz: 183.58, planet: "Jupiter" },
  { hz: 221.23, planet: "Venus" },
  { hz: 147.85, planet: "Saturn" },
];

const SOLFEGGIO: { hz: number; labelKey: string }[] = [
  { hz: 174, labelKey: "freq_solf_foundation" },
  { hz: 285, labelKey: "freq_solf_healing" },
  { hz: 396, labelKey: "freq_solf_liberation" },
  { hz: 417, labelKey: "freq_solf_change" },
  { hz: 528, labelKey: "freq_solf_love" },
  { hz: 639, labelKey: "freq_solf_connection" },
  { hz: 741, labelKey: "freq_solf_expression" },
  { hz: 852, labelKey: "freq_solf_intuition" },
  { hz: 963, labelKey: "freq_solf_oneness" },
];

const CHAKRA: { hz: number; labelKey: string }[] = [
  { hz: 256, labelKey: "freq_root" },
  { hz: 288, labelKey: "freq_sacral" },
  { hz: 320, labelKey: "freq_solar_plexus" },
  { hz: 341, labelKey: "freq_heart" },
  { hz: 384, labelKey: "freq_throat" },
  { hz: 448, labelKey: "freq_third_eye" },
  { hz: 480, labelKey: "freq_crown" },
];

const STELLAR: { hz: number; labelKey: string }[] = [
  { hz: 263, labelKey: "freq_sirius" },
  { hz: 292, labelKey: "freq_vega" },
  { hz: 194.18, labelKey: "freq_earth_day" },
  { hz: 172.06, labelKey: "freq_platonic_year" },
];

const PULSAR: { hz: number; labelKey: string }[] = [
  { hz: 30, labelKey: "freq_crab_pulsar" },
  { hz: 89, labelKey: "freq_vela_pulsar" },
  { hz: 642, labelKey: "freq_millisecond_pulsar" },
  { hz: 716, labelKey: "freq_fastest_pulsar" },
];

const COSMIC: { hz: number; labelKey: string }[] = [
  { hz: 7.83, labelKey: "freq_schumann" },
  { hz: 33, labelKey: "freq_black_hole" },
  { hz: 528, labelKey: "freq_cosmic_dna" },
  { hz: 963, labelKey: "freq_cosmic_unity" },
];

const WAVEFORMS: Waveform[] = ["sine", "square", "sawtooth", "triangle"];

function createNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * 4;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

export function FrequencyPage() {
  const { t } = useI18n();
  const a = useAstro();

  const [freqHz, setFreqHz] = useState(432);
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [freqPlaying, setFreqPlaying] = useState(false);
  const [freqVolume, setFreqVolume] = useState(0.5);

  const [noiseType, setNoiseType] = useState<NoiseType>("white");
  const [noisePlaying, setNoisePlaying] = useState(false);
  const [noiseVolume, setNoiseVolume] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const freqGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const noiseBufCache = useRef<Map<NoiseType, AudioBuffer>>(new Map());

  const freqVolRef = useRef(freqVolume);
  const noiseVolRef = useRef(noiseVolume);
  const freqPlayingRef = useRef(freqPlaying);
  const noisePlayingRef = useRef(noisePlaying);
  const freqHzRef = useRef(freqHz);
  const waveformRef = useRef(waveform);
  const noiseTypeRef = useRef(noiseType);
  useEffect(() => {
    freqVolRef.current = freqVolume;
    noiseVolRef.current = noiseVolume;
    freqPlayingRef.current = freqPlaying;
    noisePlayingRef.current = noisePlaying;
    freqHzRef.current = freqHz;
    waveformRef.current = waveform;
    noiseTypeRef.current = noiseType;
  });

  function getCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }

  function startFreq(hz: number, wave: Waveform) {
    const ctx = getCtx();
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch {}
      oscRef.current.disconnect();
    }
    if (freqGainRef.current) freqGainRef.current.disconnect();

    const gain = ctx.createGain();
    gain.gain.value = freqVolRef.current;
    gain.connect(ctx.destination);
    freqGainRef.current = gain;

    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = Math.max(1, Math.min(20000, hz));
    osc.connect(gain);
    osc.start();
    oscRef.current = osc;
    setFreqPlaying(true);
  }

  function stopFreq() {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch {}
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (freqGainRef.current) {
      freqGainRef.current.disconnect();
      freqGainRef.current = null;
    }
    setFreqPlaying(false);
  }

  function toggleFreq() {
    if (freqPlayingRef.current) stopFreq();
    else startFreq(freqHzRef.current, waveformRef.current);
  }

  function selectPreset(hz: number) {
    setFreqHz(hz);
    if (freqPlayingRef.current) startFreq(hz, waveformRef.current);
  }

  function selectWaveform(w: Waveform) {
    setWaveform(w);
    if (freqPlayingRef.current) startFreq(freqHzRef.current, w);
  }

  useEffect(() => {
    if (freqGainRef.current) freqGainRef.current.gain.value = freqVolume;
  }, [freqVolume]);

  useEffect(() => {
    if (oscRef.current && freqPlaying) {
      oscRef.current.frequency.value = Math.max(20, Math.min(20000, freqHz));
    }
  }, [freqHz, freqPlaying]);

  function startNoise(type: NoiseType) {
    const ctx = getCtx();
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch {}
      noiseSourceRef.current.disconnect();
    }
    if (noiseGainRef.current) noiseGainRef.current.disconnect();

    const gain = ctx.createGain();
    gain.gain.value = noiseVolRef.current;
    gain.connect(ctx.destination);
    noiseGainRef.current = gain;

    let buf = noiseBufCache.current.get(type);
    if (!buf) {
      buf = createNoiseBuffer(ctx, type);
      noiseBufCache.current.set(type, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    noiseSourceRef.current = src;
    setNoisePlaying(true);
  }

  function stopNoise() {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch {}
      noiseSourceRef.current.disconnect();
      noiseSourceRef.current = null;
    }
    if (noiseGainRef.current) {
      noiseGainRef.current.disconnect();
      noiseGainRef.current = null;
    }
    setNoisePlaying(false);
  }

  function toggleNoise() {
    if (noisePlayingRef.current) stopNoise();
    else startNoise(noiseTypeRef.current);
  }

  function selectNoiseType(type: NoiseType) {
    setNoiseType(type);
    if (noisePlayingRef.current) startNoise(type);
  }

  function handleNoiseVolume(v: number) {
    setNoiseVolume(v);
    if (noiseGainRef.current) noiseGainRef.current.gain.value = v;
  }

  useEffect(() => {
    return () => {
      try {
        oscRef.current?.stop();
      } catch {}
      try {
        noiseSourceRef.current?.stop();
      } catch {}
      oscRef.current?.disconnect();
      freqGainRef.current?.disconnect();
      noiseSourceRef.current?.disconnect();
      noiseGainRef.current?.disconnect();
      audioCtxRef.current?.close();
    };
  }, []);

  const waveKey = (w: Waveform) =>
    `freq_${w}` as "freq_sine" | "freq_square" | "freq_sawtooth" | "freq_triangle";

  return (
    <section data-testid="frequency-view" className="pt-3 sm:pt-4 pb-8 max-w-4xl mx-auto space-y-4">
      {/* Page header */}
      <div className="card p-3 sm:p-4 lg:p-5">
        <p className="eyebrow-accent">{t("freq_eyebrow")}</p>
        <h2 className="heading-page mt-0.5">{t("freq_title")}</h2>
        <p className="meta mt-1">{t("freq_subtitle")}</p>
      </div>

      {/* Frequency Generator */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <h3 className="heading-section">{t("freq_generator")}</h3>

        {/* Status line */}
        <p className={`meta mt-2 font-medium ${freqPlaying ? "text-saffron" : ""}`}>
          {freqPlaying
            ? `${t("freq_playing")}: ${freqHz} ${t("freq_hz")} - ${t(waveKey(waveform))}`
            : t("freq_stopped")}
        </p>

        {/* Waveform selector */}
        <div className="mt-4">
          <p className="eyebrow-accent mb-2">{t("freq_waveform")}</p>
          <div className="flex flex-wrap gap-2">
            {WAVEFORMS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => selectWaveform(w)}
                className={`tag cursor-pointer transition-colors ${
                  waveform === w
                    ? "bg-saffron/10 text-saffron border-saffron/40"
                    : "hover:border-saffron/30 hover:text-saffron"
                }`}
              >
                {t(waveKey(w))}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency slider + manual input */}
        <div className="mt-4">
          <label className="field-label">{t("freq_custom")}</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={1}
              max={2000}
              step={0.01}
              value={Math.min(freqHz, 2000)}
              onChange={(e) => setFreqHz(Number(e.target.value))}
              className="flex-1 max-w-sm"
              style={{ accentColor: "var(--primary)" }}
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={20000}
                step={0.01}
                value={freqHz}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 1 && v <= 20000) setFreqHz(v);
                }}
                className="field w-24 text-center tabular-nums"
              />
              <span className="meta">{t("freq_hz")}</span>
            </div>
          </div>
          <div className="flex justify-between max-w-sm text-[11px] text-ink-muted mt-0.5">
            <span>1 {t("freq_hz")}</span>
            <span>2000 {t("freq_hz")}</span>
          </div>
        </div>

        {/* Volume slider */}
        <div className="mt-4">
          <label className="field-label">
            {t("freq_volume")}: {Math.round(freqVolume * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={freqVolume}
            onChange={(e) => setFreqVolume(Number(e.target.value))}
            className="w-full max-w-xs"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>

        {/* Play / Pause */}
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleFreq}
            className={freqPlaying ? "btn-ghost" : "btn-primary"}
            data-testid="freq-play-btn"
          >
            {freqPlaying ? t("freq_pause") : t("freq_play")}
          </button>
        </div>

        {/* Preset groups */}
        <div className="mt-5 pt-4 border-t border-parchment-200 space-y-4">
          {/* Most Popular */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_most_popular")}</p>
            <div className="flex flex-wrap gap-2">
              {MOST_POPULAR.map((p) => (
                <button
                  key={p.hz}
                  type="button"
                  onClick={() => selectPreset(p.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === p.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {p.hz} {t("freq_hz")}
                  {p.labelKey && <span className="text-ink-muted ml-1">({t(p.labelKey)})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Vedic Healing */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_vedic")}</p>
            <div className="flex flex-wrap gap-2">
              {VEDIC.map((v) => (
                <button
                  key={v.hz}
                  type="button"
                  onClick={() => selectPreset(v.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === v.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {v.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(v.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navagraha */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_navagraha")}</p>
            <div className="flex flex-wrap gap-2">
              {NAVAGRAHA.map((g) => (
                <button
                  key={g.hz}
                  type="button"
                  onClick={() => selectPreset(g.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === g.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {g.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({a.planet(g.planet)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Solfeggio */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_solfeggio")}</p>
            <div className="flex flex-wrap gap-2">
              {SOLFEGGIO.map((s) => (
                <button
                  key={s.hz}
                  type="button"
                  onClick={() => selectPreset(s.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === s.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {s.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(s.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chakra */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_chakra")}</p>
            <div className="flex flex-wrap gap-2">
              {CHAKRA.map((c) => (
                <button
                  key={c.hz}
                  type="button"
                  onClick={() => selectPreset(c.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === c.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {c.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(c.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stellar */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_stellar")}</p>
            <div className="flex flex-wrap gap-2">
              {STELLAR.map((s) => (
                <button
                  key={s.hz}
                  type="button"
                  onClick={() => selectPreset(s.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === s.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {s.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(s.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pulsar */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_pulsar")}</p>
            <div className="flex flex-wrap gap-2">
              {PULSAR.map((p) => (
                <button
                  key={p.hz}
                  type="button"
                  onClick={() => selectPreset(p.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === p.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {p.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(p.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cosmic / Galactic */}
          <div>
            <p className="eyebrow-accent mb-2">{t("freq_cosmic")}</p>
            <div className="flex flex-wrap gap-2">
              {COSMIC.map((c) => (
                <button
                  key={c.hz}
                  type="button"
                  onClick={() => selectPreset(c.hz)}
                  className={`tag cursor-pointer transition-colors ${
                    freqHz === c.hz && freqPlaying
                      ? "bg-saffron/10 text-saffron border-saffron/40"
                      : "hover:border-saffron/30 hover:text-saffron"
                  }`}
                >
                  {c.hz} {t("freq_hz")}
                  <span className="text-ink-muted ml-1">({t(c.labelKey)})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Noise Generator */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <h3 className="heading-section">{t("freq_noise")}</h3>

        {/* Status */}
        <p className={`meta mt-2 font-medium ${noisePlaying ? "text-saffron" : ""}`}>
          {noisePlaying
            ? `${t("freq_playing")}: ${t(`freq_${noiseType}_noise`)}`
            : t("freq_stopped")}
        </p>

        {/* Noise type buttons */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {(["white", "pink", "brown"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => selectNoiseType(type)}
                data-testid={`noise-${type}-btn`}
                className={`tag cursor-pointer transition-colors ${
                  noiseType === type
                    ? "bg-saffron/10 text-saffron border-saffron/40"
                    : "hover:border-saffron/30 hover:text-saffron"
                }`}
              >
                {t(`freq_${type}_noise`)}
              </button>
            ))}
          </div>
          <p className="meta mt-2">{t(`freq_${noiseType}_desc`)}</p>
        </div>

        {/* Volume slider */}
        <div className="mt-4">
          <label className="field-label">
            {t("freq_volume")}: {Math.round(noiseVolume * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={noiseVolume}
            onChange={(e) => handleNoiseVolume(Number(e.target.value))}
            className="w-full max-w-xs"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>

        {/* Play / Pause */}
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleNoise}
            className={noisePlaying ? "btn-ghost" : "btn-primary"}
            data-testid="noise-play-btn"
          >
            {noisePlaying ? t("freq_pause") : t("freq_play")}
          </button>
        </div>
      </div>
    </section>
  );
}
