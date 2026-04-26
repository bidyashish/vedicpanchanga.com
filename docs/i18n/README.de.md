# Vedic Panchanga

> [English](../../README.md) · [हिन्दी](../../README.hi.md) · [தமிழ்](../../README.ta.md) ·
> [中文](README.zh.md) · [日本語](README.ja.md) · [Español](README.es.md) ·
> **Deutsch** · [Português](README.pt.md) · [Français](README.fr.md)

Drik-Panchang-Rechner mit moderner Web-Oberfläche. Berechnet die traditionellen Elemente des hinduistischen Panchang, die 16 Teilcharts (D1–D60), Vimshottari Daśā, Aṣṭakavarga sowie günstige Muhūrta-Fenster für jedes Datum (5000 v. Chr. – 5000 n. Chr.) und jeden Ort.

**Website**: <https://vedicpanchanga.com>

⭐ Wenn dir das Projekt nützt, vergib bitte einen Stern auf GitHub — so finden andere das Tool leichter.

---

## Tech-Stack

| Schicht  | Technologie |
| -------- | ----------- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` auf `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA mit sauberen URLs auf Port 3121 |
| Infra    | Cloudflare → Nginx (TLS, statische Dateien) → FastAPI Loopback · optional Prometheus + Grafana |

**Keine Datenbank** — alle Berechnungen sind zustandslos und das Backend speichert nichts dauerhaft.

---

## Lokal ausführen

Benötigt Python 3.10+ und Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) Backend (Terminal 1) — FastAPI auf :8001
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) Frontend (Terminal 2) — Vite-Dev-Server auf :3121
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Öffne <http://localhost:3121>. Swagger-UI: <http://localhost:8001/docs>.

---

## Funktionen

- **Jyotiṣa Kuṇḍalī** — Geburtshoroskop mit 16 Teilcharts (D1–D60), nord- oder südindischer Stil
- **Tägliches Drik Pañcāṅga** — Tithi · Nakṣatra · Yoga · Karaṇa · Vāra, Sonnen-/Mondzeiten, Rāhu Kāla, Abhijit usw.
- **Muhūrta-Finder** — bis zu 120 Tage nach günstigen Zeiten für Hochzeit, gṛha-praveśa, Geschäft, Reise u. v. m. durchsuchen
- **Vimshottari Mahādaśā** — vollständiger 120-Jahres-Zyklus ab Geburt (inkl. Antardaśā + Pratyantar)
- **Aṣṭakavarga** — Bhinnāṣṭakavarga pro Planet + Sarvāṣṭakavarga-Summen
- **Jaimini-System** — Chara-Karakas, Karakāṁśa- und Swāṁśa-Charts
- **PDF-Bericht** — 19-seitiger druckbarer zweisprachiger (English / हिन्दी) Bericht
- **Mehrere Ayanāṁśa** — N.C. Lahiri (Standard), KP Neu/Alt, B.V. Raman, KP Khullar, Sāyana, Manoj
- **Zweisprachige UI** — English + हिन्दी, mit Devanāgarī-Webfonts

---

## API

Alle Endpoints liegen unter `/api`. In der Produktion proxyt Nginx sie auf demselben Origin.

| Methode | Pfad                    | Zweck                                                                  |
|---------|-------------------------|------------------------------------------------------------------------|
| POST    | `/api/calculate`        | Vollständiges Horoskop (Planeten, 16 Vargas, daśā, aṣṭakavarga, karakas, kālasarpa) |
| GET     | `/api/get-panchang`     | Drik Pañcāṅga für ein Datum + einen Ort                                |
| GET     | `/api/ayanamsa-options` | Verfügbare Ayanāṁśa-Systeme                                           |
| GET     | `/api/muhurta-purposes` | Muhūrta-Zweck-Kategorien                                               |
| POST    | `/api/find-muhurta`     | In einem Datumsbereich nach günstigen Fenstern suchen                  |
| POST    | `/api/print-pdf`        | Vollständigen PDF-Bericht erzeugen (en/hi)                              |

Detaillierte Doku pro Verzeichnis (auf Englisch):
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md).
Vollständige Deploy-Anleitung im Root-[`README.md`](../../README.md).

---

## Lizenz

**Backend**: AGPL-3.0 · **Frontend**: MIT

Basiert auf [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) von Satish BD. Astronomische Berechnungen über [Swiss Ephemeris](https://www.astro.com/swisseph/).
