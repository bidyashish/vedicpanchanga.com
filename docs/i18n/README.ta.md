# வேத பஞ்சாங்கம்

> [English](../../README.md) · [हिन्दी](README.hi.md) · **தமிழ்** ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

நவீன வலை இடைமுகத்துடன் கூடிய திருக்-பஞ்சாங்க கணிப்பான். எந்த தேதிக்கும் (கி.மு. 5000 – கி.பி. 5000) எந்த இடத்திற்கும் — பாரம்பரிய இந்து பஞ்சாங்கம், 16 பகுப்பு கட்டங்கள் (D1–D60), விம்சோத்தரி தசை, அஷ்டகவர்கம், மற்றும் சுபமான முகூர்த்தங்கள்.

**இணையதளம்**: <https://vedicpanchanga.com>

⭐ இந்த திட்டம் உங்களுக்கு பயனுள்ளதாக இருந்தால், களஞ்சியத்தை நட்சத்திரமிடுங்கள் — இது மற்றவர்களுக்கு கருவியைக் கண்டறிய உதவும்.

---

## தொழில்நுட்ப அடுக்கு

| அடுக்கு  | தொழில்நுட்பம் |
| -------- | ------------- |
| பின்தளம் | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` `127.0.0.1:8001` இல் |
| முன்தளம்  | Vite · React 19 · TypeScript · Tailwind CSS v4 · போர்ட் 3121 இல் சுத்தமான-URL SPA |
| உள்கட்டமைப்பு | Cloudflare → Nginx (TLS, நிலையான-கோப்பு ஹோஸ்ட்) → FastAPI loopback · விருப்பத் தேர்வாக Prometheus + Grafana |

தரவுத்தளம் இல்லை — அனைத்து கணக்கீடுகளும் நிலையற்றவை, பின்தளம் எதையும் சேமிக்காது.

---

## உள்ளக அமைப்பு

Python 3.10+ மற்றும் Node.js 20+ தேவை.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) பின்தளம் (முனையம் 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) முன்தளம் (முனையம் 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

உலாவியில் <http://localhost:3121> திறக்கவும். Swagger ஆவணங்கள்: <http://localhost:8001/docs>.

---

## அம்சங்கள்

- **ஜோதிட குண்டலி** — 16 பகுப்பு கட்டங்கள் (D1–D60), வடக்கு / தெற்கு இந்திய பாணி
- **திருக் பஞ்சாங்கம்** — திதி · நட்சத்திரம் · யோகம் · கரணம் · வாரம், சூரிய/சந்திர நேரங்கள், ராகு காலம், அபிஜித் மற்றும் பல
- **முகூர்த்த கண்டுபிடிப்பான்** — திருமணம், கிரஹ பிரவேசம், வணிகம், பயணம் ஆகியவற்றுக்கு 120 நாட்கள் வரை ஸ்கேன்
- **விம்சோத்தரி மகாதசை** — பிறந்தது முதல் 120 ஆண்டு முழுச் சுழற்சி (அந்தர்தசை + பிரத்யந்தர் உள்ளிட்டு)
- **அஷ்டகவர்கம்** — ஒவ்வொரு கிரகத்துக்கும் பின்னாஷ்டகவர்கம் + சர்வாஷ்டகவர்க கூட்டுத்தொகை
- **ஜைமினி** — சர காரகர்கள், காரகம்ச மற்றும் சுவாம்ச கட்டங்கள்
- **PDF அறிக்கை** — 19-பக்க அச்சிடக்கூடிய பல்மொழி (English / हिन्दी) அறிக்கை
- **பல அயனாம்சம்** — N.C. லாஹிரி (இயல்புநிலை), KP புதியது/பழையது, B.V. ராமன், KP குல்லர், சாயன, மனோஜ்
- **இரு மொழி UI** — English + हिन्दी, தேவநாகரி வலை எழுத்துருக்களுடன்

---

## API

அனைத்து endpoints `/api` கீழ் உள்ளன. உற்பத்தியில் Nginx இவற்றை அதே மூலத்தில் proxy செய்கிறது.

| Method | பாதை                    | நோக்கம்                                                |
|--------|------------------------|--------------------------------------------------------|
| POST   | `/api/calculate`       | முழு குண்டலி (கிரகங்கள், 16 வர்க்கங்கள், தசை, அஷ்டகவர்கம், காரகர்கள், காளசர்ப) |
| GET    | `/api/get-panchang`    | ஒரு தேதி + இடத்திற்கான திருக் பஞ்சாங்கம்            |
| GET    | `/api/ayanamsa-options`| கிடைக்கக்கூடிய அயனாம்ச அமைப்புகள்                     |
| GET    | `/api/muhurta-purposes`| முகூர்த்த நோக்க வகைகள்                                 |
| POST   | `/api/find-muhurta`    | ஒரு காலகட்டத்தில் சுபமான வாய்ப்புகளை ஸ்கேன் செய்       |
| POST   | `/api/print-pdf`       | முழு PDF அறிக்கை (en/hi)                                 |

ஒவ்வொரு கோப்புறைக்கான விரிவான ஆவணம் (ஆங்கிலத்தில்):
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md).
வரிசைப்படுத்துதல் (deploy) வழிமுறைகளுக்கு முதன்மை [`README.md`](../../README.md)-ஐப் பார்க்கவும்.

---

## உரிமம்

**பின்தளம்**: AGPL-3.0 · **முன்தளம்**: MIT

[Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD) அடிப்படையில். வானியல் கணக்கீடுகள் [Swiss Ephemeris](https://www.astro.com/swisseph/) வழியாக.
