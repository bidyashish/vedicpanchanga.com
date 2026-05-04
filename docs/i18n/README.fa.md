# پنچانگه ودایی

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> **فارسی** · [עברית](README.he.md)

محاسبه‌گر دریک پنچانگه با رابط وب مدرن. عناصر سنتی پنچانگه هندو، زایچه‌های تقسیمی (D1-D60)، ویمشوتری داشا، اشتاکاوارگه و پنجره‌های فرخنده مهورته را برای هر تاریخ (5000 ق.م - 5000 م) و هر مکانی محاسبه می‌کند.

**وب‌سایت**: <https://vedicpanchanga.com>

⭐ اگر این پروژه برای شما مفید است، لطفاً به مخزن ستاره بدهید - این به دیگران کمک می‌کند آن را پیدا کنند.

---

## پشته فنی

| لایه    | فناوری |
| ------ | ----- |
| بک‌اند   | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` روی `127.0.0.1:8001` |
| فرانت‌اند | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA با URL تمیز روی پورت 3121 |
| زیرساخت | Cloudflare ← Nginx (TLS، میزبانی استاتیک) ← FastAPI loopback · Prometheus + Grafana اختیاری |

پایگاه داده‌ای **وجود ندارد**. محاسبات بدون وضعیت هستند؛ بک‌اند چیزی ذخیره نمی‌کند.

---

## راه‌اندازی محلی

نیاز به Python 3.10+ و Node.js 20+ دارد.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) بک‌اند (ترمینال 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) فرانت‌اند (ترمینال 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

<http://localhost:3121> را در مرورگر باز کنید. مستندات Swagger: <http://localhost:8001/docs>.

---

## ویژگی‌ها

- **جیوتیشا کوندالی** - زایچه تولد با 16 زایچه تقسیمی (D1-D60)، سبک شمال یا جنوب هند
- **دریک پنچانگه** - تیتی · نکشتره · یوگا · کاران · وارا، زمان‌های خورشید/ماه، راهو کاله، ابهی‌جیت و بیشتر
- **یابنده مهورته** - اسکن تا 120 روز برای ازدواج، خانه‌نشینی، تجارت، سفر و غیره
- **ویمشوتری مهاداشا** - چرخه کامل 120 ساله سیارات از تولد (با انترداشا و پرتیانتر)
- **اشتاکاوارگه** - بهیناشتاکاوارگه برای هر سیاره + مجموع‌های سرواشتاکاوارگه
- **جیمینی** - چاره کاراکا، زایچه‌های کاراکامسا و سوامسا
- **گزارش PDF** - گزارش 19 صفحه‌ای چندزبانه قابل چاپ
- **چند ایانامسا** - NC Lahiri (پیش‌فرض)، KP New/Old، BV Raman، KP Khullar، سایانا، مانوج
- **رابط چندزبانه** - 15 زبان، تغییر خودکار جهت برای زبان‌های RTL (عربی / فارسی / عبری)

---

## API

تمام نقاط پایانی تحت `/api` هستند. در محصول، Nginx آن‌ها را به همان مبدأ پروکسی می‌کند.

| Method | Path                    | هدف                                                   |
|--------|-------------------------|------------------------------------------------------|
| POST   | `/api/calculate`        | کوندالی کامل (سیارات، 16 وارگه، داشا، اشتاکاوارگه، کاراکا، کالسارپه) |
| GET    | `/api/get-panchang`     | دریک پنچانگه برای تاریخ + مکان                        |
| GET    | `/api/ayanamsa-options` | فهرست ایانامساهای موجود                              |
| GET    | `/api/muhurta-purposes` | دسته‌های اهداف مهورته                                 |
| POST   | `/api/find-muhurta`     | اسکن یک بازه تاریخی برای پنجره‌های فرخنده              |
| POST   | `/api/print-pdf`        | گزارش کامل PDF (15 زبان)                              |

مستندات کامل به انگلیسی:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md).
برای دستورالعمل‌های استقرار، [`README.md`](../../README.md) اصلی را ببینید.

---

## مجوز

**بک‌اند**: AGPL-3.0 · **فرانت‌اند**: MIT

بر اساس [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD). محاسبات نجومی از طریق [Swiss Ephemeris](https://www.astro.com/swisseph/).
