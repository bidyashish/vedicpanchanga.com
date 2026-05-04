# वैदिक पंचांग

> [English](../../README.md) · **हिन्दी** · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

आधुनिक वेब इंटरफ़ेस के साथ दृक्-पंचांग कैलकुलेटर। पारंपरिक हिंदू पंचांग, १६ वर्ग चक्र (D1–D60), विंशोत्तरी दशा, अष्टकवर्ग और शुभ मुहूर्त — किसी भी तिथि (५००० ईसा पूर्व – ५००० ईस्वी) और किसी भी स्थान के लिए।

**वेबसाइट**: <https://vedicpanchanga.com>

⭐ यदि यह परियोजना आपके लिए उपयोगी है, तो कृपया रिपॉजिटरी को स्टार दें — इससे दूसरों को इसे खोजने में मदद मिलती है।

---

## तकनीकी स्टैक

| परत    | प्रौद्योगिकी |
| ------ | ------------ |
| बैकएंड  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` `127.0.0.1:8001` पर |
| फ़्रंटएंड | Vite · React 19 · TypeScript · Tailwind CSS v4 · पोर्ट 3121 पर क्लीन-URL SPA |
| इंफ्रा   | Cloudflare → Nginx (TLS, स्टैटिक होस्टिंग) → FastAPI लूपबैक · वैकल्पिक Prometheus + Grafana |

कोई डेटाबेस नहीं है — सभी गणनाएँ स्टेटलेस हैं और बैकएंड कुछ भी संग्रहीत नहीं करता।

---

## स्थानीय सेटअप

Python 3.10+ और Node.js 20+ चाहिए।

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) बैकएंड (टर्मिनल 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) फ़्रंटएंड (टर्मिनल 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

ब्राउज़र में <http://localhost:3121> खोलें। Swagger डॉक्स: <http://localhost:8001/docs>।

---

## विशेषताएँ

- **ज्योतिष कुण्डली** — १६ वर्ग चक्र (D1–D60), उत्तर या दक्षिण भारतीय शैली
- **दृक् पंचांग** — तिथि · नक्षत्र · योग · करण · वार, सूर्य/चंद्र समय, राहु काल, अभिजित और अधिक
- **मुहूर्त खोजक** — विवाह, गृह प्रवेश, व्यापार, यात्रा आदि के लिए १२० दिनों तक स्कैन
- **विंशोत्तरी महादशा** — जन्म से १२० वर्षीय पूर्ण चक्र (अंतर्दशा + प्रत्यंतर सहित)
- **अष्टकवर्ग** — प्रति ग्रह भिन्नाष्टकवर्ग + सर्वाष्टकवर्ग योग
- **जैमिनी** — चर कारक, कारकांश एवं स्वांश चक्र
- **PDF रिपोर्ट** — १९-पृष्ठ का बहुभाषीय (अंग्रेज़ी / हिन्दी) मुद्रण-योग्य रिपोर्ट
- **बहु-अयनांश** — N.C. लाहिरी (डिफ़ॉल्ट), KP नया/पुराना, B.V. रमण, KP खुल्लर, सायन, मनोज
- **द्विभाषी UI** — English + हिन्दी, देवनागरी वेब फ़ॉन्ट के साथ

---

## API

सभी एंडपॉइंट `/api` के अंतर्गत हैं। प्रोडक्शन में Nginx इन्हें उसी ओरिजिन पर प्रॉक्सी करता है।

| Method | Path                    | उद्देश्य                                              |
|--------|-------------------------|----------------------------------------------------|
| POST   | `/api/calculate`        | पूर्ण कुण्डली (ग्रह, १६ वर्ग, दशा, अष्टकवर्ग, कारक, कालसर्प) |
| GET    | `/api/get-panchang`     | किसी दिनांक + स्थान का दृक् पंचांग                |
| GET    | `/api/ayanamsa-options` | उपलब्ध अयनांश सूची                                |
| GET    | `/api/muhurta-purposes` | मुहूर्त उद्देश्य श्रेणियाँ                          |
| POST   | `/api/find-muhurta`     | किसी अवधि में शुभ मुहूर्त खोज                     |
| POST   | `/api/print-pdf`        | पूर्ण PDF रिपोर्ट (en/hi)                            |

विस्तृत प्रति-फ़ोल्डर दस्तावेज़ अंग्रेज़ी में:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md)।
तैनाती (deploy) निर्देशों के लिए मुख्य [`README.md`](../../README.md) देखें।

---

## लाइसेंस

**बैकएंड**: AGPL-3.0 · **फ़्रंटएंड**: MIT

[Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD) पर आधारित। खगोलीय गणनाएँ [Swiss Ephemeris](https://www.astro.com/swisseph/) से।
