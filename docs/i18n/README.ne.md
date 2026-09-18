# वैदिक पञ्चाङ्ग

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · **नेपाली** · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

आधुनिक वेब इन्टरफेस सहितको दृक् पञ्चाङ्ग क्याल्कुलेटर। पारम्परिक हिन्दू पञ्चाङ्गका अंग, १६ वर्ग चक्र (D1-D60), विंशोत्तरी दशा, अष्टकवर्ग र शुभ मुहूर्त - कुनै पनि मिति (५००० ई.पू. - ५००० ई.) र कुनै पनि स्थानको लागि गणना गर्दछ।

**वेबसाइट**: <https://vedicpanchanga.com>

⭐ यदि यो परियोजना तपाईंको लागि उपयोगी छ भने, कृपया रिपोजिटोरीलाई स्टार दिनुहोस् - यसले अरूलाई यो खोज्न मद्दत गर्छ।

---

## प्राविधिक स्ट्याक

| तह     | प्रविधि |
| ------ | ------- |
| ब्याकेन्ड  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `127.0.0.1:8001` मा `uvicorn` |
| फ्रन्टेन्ड | Vite · React 19 · TypeScript · Tailwind CSS v4 · पोर्ट 3121 मा क्लीन-URL SPA |
| इन्फ्रा   | Cloudflare → Nginx (TLS, स्थिर होस्टिङ) → FastAPI लूपब्याक · वैकल्पिक Prometheus + Grafana |

कुनै डाटाबेस छैन - सबै गणनाहरू स्टेटलेस छन् र ब्याकेन्डले केही पनि भण्डारण गर्दैन।

---

## स्थानीय सेटअप

Python 3.10+ र Node.js 20+ चाहिन्छ।

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) ब्याकेन्ड (टर्मिनल 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) फ्रन्टेन्ड (टर्मिनल 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

ब्राउजरमा <http://localhost:3121> खोल्नुहोस्। Swagger डक्स: <http://localhost:8001/docs>।

---

## विशेषताहरू

- **ज्योतिष कुण्डली** - १६ वर्ग चक्र (D1-D60), उत्तर वा दक्षिण भारतीय शैली
- **दृक् पञ्चाङ्ग** - तिथि · नक्षत्र · योग · करण · वार, सूर्य/चन्द्र समय, राहु काल, अभिजित आदि
- **मुहूर्त खोज** - विवाह, गृह प्रवेश, व्यापार, यात्रा आदिको लागि १२० दिनसम्म स्क्यान
- **विंशोत्तरी महादशा** - जन्मदेखि १२० वर्षीय पूर्ण चक्र (अन्तर्दशा + प्रत्यन्तर सहित)
- **अष्टकवर्ग** - प्रति ग्रह भिन्नाष्टकवर्ग + सर्वाष्टकवर्ग योग
- **जैमिनी** - चर कारक, कारकांश र स्वांश चक्र
- **PDF रिपोर्ट** - १९-पृष्ठीय बहुभाषिक मुद्रण योग्य रिपोर्ट
- **बहु-अयनांश** - N.C. लाहिडी (डिफल्ट), KP नयाँ/पुरानो, B.V. रमण, KP खुल्लर, सायन, मनोज
- **बहुभाषिक UI** - १५ भाषा, RTL भाषा (अरबी / फारसी / हिब्रू) का लागि स्वचालित दिशा फेर्ने

---

## API

सबै एन्डपोइन्टहरू `/api` अन्तर्गत छन्। उत्पादनमा Nginx ले यिनलाई उही मूलमा प्रोक्सी गर्छ।

| Method | Path                    | उद्देश्य                                            |
|--------|-------------------------|--------------------------------------------------|
| POST   | `/api/calculate`        | पूर्ण कुण्डली (ग्रह, १६ वर्ग, दशा, अष्टकवर्ग, कारक, कालसर्प) |
| GET    | `/api/get-panchang`     | कुनै मिति + स्थानको दृक् पञ्चाङ्ग                |
| GET    | `/api/ayanamsa-options` | उपलब्ध अयनांशको सूची                            |
| GET    | `/api/muhurta-purposes` | मुहूर्त उद्देश्य श्रेणीहरू                        |
| POST   | `/api/find-muhurta`     | एक अवधिमा शुभ मुहूर्त खोज                       |
| POST   | `/api/print-pdf`        | पूर्ण PDF रिपोर्ट (१५ भाषा)                       |

विस्तृत डक्स अंग्रेजीमा:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md)।
तैनातीका लागि मुख्य [`README.md`](../../README.md) हेर्नुहोस्।

---

## इजाजतपत्र

**ब्याकेन्ड**: AGPL-3.0 · **फ्रन्टेन्ड**: MIT

[Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD) मा आधारित। खगोलीय गणनाहरू [Swiss Ephemeris](https://www.astro.com/swisseph/) द्वारा।
