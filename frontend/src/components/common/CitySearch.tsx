import { useEffect, useRef, useState } from "react";
import { geocode } from "@/lib/api";
import type { LocationChoice, NominatimResult } from "@/types/api";
import { MandalaLoader } from "@/components/common/MandalaLoader";

export function CitySearch({
  value,
  onSelect,
  label,
  placeholder,
  testIdPrefix = "city-search",
}: {
  value?: string;
  onSelect: (loc: LocationChoice) => void;
  label?: string;
  placeholder?: string;
  testIdPrefix?: string;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setQuery(value ?? ""), [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (v.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      const res = await geocode(v, 6);
      setResults(res);
      setLoading(false);
    }, 400);
  };

  const choose = (r: NominatimResult) => {
    setQuery(r.display_name);
    setOpen(false);
    onSelect({
      place_name: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      timezone: null,
    });
  };

  return (
    <div className="relative" ref={boxRef}>
      {label && <label className="field-label">{label}</label>}
      <div className="relative">
        <input
          data-testid={`${testIdPrefix}-input`}
          type="text"
          value={query}
          onChange={onChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={placeholder ?? "Search city…"}
          className="field"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-crimson">
            <MandalaLoader size={18} />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          data-testid={`${testIdPrefix}-results`}
          className="absolute z-30 mt-1 w-full bg-parchment-50 border border-parchment-200 rounded-sm shadow-lift max-h-64 overflow-auto"
        >
          {results.map((r, i) => (
            <li
              key={r.place_id}
              data-testid={`${testIdPrefix}-option-${i}`}
              onClick={() => choose(r)}
              className="px-3 py-2 text-sm text-ink hover:bg-parchment-100 cursor-pointer border-b border-parchment-200/50 last:border-0"
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
