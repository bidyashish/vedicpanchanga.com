# بانشانغا الفيدية

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · **العربية** ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

حاسبة دريك بانشانغا مع واجهة ويب حديثة. تحسب عناصر بانشانغا الهندوسية التقليدية، والخرائط التقسيمية (D1-D60)، وفيمشوتاري داشا، وأشتاكافارغا، ونوافذ المهورتا الميمونة لأي تاريخ (5000 ق.م - 5000 م) وأي موقع.

**الموقع**: <https://vedicpanchanga.com>

⭐ إذا كان هذا المشروع مفيداً لك، فضلاً امنح المستودع نجمة - فهذا يساعد الآخرين في العثور عليه.

---

## المكدس التقني

| الطبقة   | المكدس |
| -------- | ----- |
| الخلفية   | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` على `127.0.0.1:8001` |
| الواجهة   | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA بروابط نظيفة على المنفذ 3121 |
| البنية   | Cloudflare ← Nginx (TLS، استضافة ثابتة) ← FastAPI loopback · Prometheus + Grafana اختياري |

**لا** توجد قاعدة بيانات. الحسابات بدون حالة؛ الخلفية لا تخزن شيئاً.

---

## الإعداد المحلي

يتطلب Python 3.10+ و Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) الخلفية (الطرفية 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) الواجهة (الطرفية 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

افتح <http://localhost:3121> في المتصفح. توثيق Swagger: <http://localhost:8001/docs>.

---

## الميزات

- **كونداليني جيوتيشا** - خريطة الميلاد مع 16 خريطة تقسيمية (D1-D60)، بأسلوب هندي شمالي أو جنوبي
- **دريك بانشانغا** - تيتي · ناكشاترا · يوغا · كاران · فارا، أوقات الشمس/القمر، راهو كالا، أبهيجيت والمزيد
- **باحث المهورتا** - مسح حتى 120 يوماً للزواج، تدشين المنزل، الأعمال، السفر إلخ
- **فيمشوتاري ماهاداشا** - دورة كوكبية كاملة لـ 120 سنة من الميلاد (مع أنتارداشا و براتيانتار)
- **أشتاكافارغا** - بهيناشتاكافارغا لكل كوكب + مجاميع سارفاشتاكافارغا
- **جيميني** - تشارا كاراكا، خرائط كاراكامسا و سوامسا
- **تقرير PDF** - تقرير قابل للطباعة من 19 صفحة بلغات متعددة
- **أيانامسا متعددة** - NC Lahiri (افتراضي)، KP New/Old، BV Raman، KP Khullar، Sayana، Manoj
- **واجهة متعددة اللغات** - 15 لغة، تبديل تلقائي للاتجاه للغات RTL (العربية / الفارسية / العبرية)

---

## API

جميع نقاط النهاية تحت `/api`. في الإنتاج، يقوم Nginx بتوجيهها إلى نفس الأصل.

| Method | Path                    | الغرض                                                   |
|--------|-------------------------|--------------------------------------------------------|
| POST   | `/api/calculate`        | كونداليني كاملة (الكواكب، 16 فارغا، داشا، أشتاكافارغا، الكاراكا، كالسارباس) |
| GET    | `/api/get-panchang`     | دريك بانشانغا لتاريخ + موقع                            |
| GET    | `/api/ayanamsa-options` | قائمة بأنظمة الأيانامسا المتاحة                       |
| GET    | `/api/muhurta-purposes` | فئات أغراض المهورتا                                    |
| POST   | `/api/find-muhurta`     | البحث عن نوافذ ميمونة في نطاق تاريخي                  |
| POST   | `/api/print-pdf`        | تقرير PDF كامل (15 لغة)                                |

التوثيق التفصيلي بالإنجليزية:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md).
لتعليمات النشر، راجع [`README.md`](../../README.md) الرئيسي.

---

## الترخيص

**الخلفية**: AGPL-3.0 · **الواجهة**: MIT

مبني على [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD). الحسابات الفلكية عبر [Swiss Ephemeris](https://www.astro.com/swisseph/).
