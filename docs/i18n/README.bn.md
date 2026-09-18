# বৈদিক পঞ্জিকা

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> **বাংলা** · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

আধুনিক ওয়েব ইন্টারফেস সহ দৃক্‌সিদ্ধ পঞ্জিকা ক্যালকুলেটর। ঐতিহ্যবাহী হিন্দু পঞ্জিকার অঙ্গ, ১৬টি বর্গচক্র (D1-D60), বিংশোত্তরী দশা, অষ্টকবর্গ ও শুভ মুহূর্ত - যেকোনো তারিখ (৫০০০ খ্রিস্টপূর্ব - ৫০০০ খ্রিস্টাব্দ) এবং যেকোনো স্থানের জন্য গণনা করে।

**ওয়েবসাইট**: <https://vedicpanchanga.com>

⭐ এই প্রকল্পটি যদি আপনার কাজে আসে, অনুগ্রহ করে রিপোজিটরিটিতে স্টার দিন - এটি অন্যদের এটি খুঁজে পেতে সাহায্য করে।

---

## প্রযুক্তিগত স্ট্যাক

| স্তর    | প্রযুক্তি |
| ------ | -------- |
| ব্যাকএন্ড  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `127.0.0.1:8001`-এ `uvicorn` |
| ফ্রন্টএন্ড | Vite · React 19 · TypeScript · Tailwind CSS v4 · পোর্ট 3121-এ ক্লিন-URL SPA |
| ইনফ্রা   | Cloudflare → Nginx (TLS, স্ট্যাটিক হোস্টিং) → FastAPI লুপব্যাক · ঐচ্ছিক Prometheus + Grafana |

কোনো ডাটাবেস নেই - সমস্ত গণনা স্টেটলেস এবং ব্যাকএন্ড কিছুই সংরক্ষণ করে না।

---

## স্থানীয় সেটআপ

Python 3.10+ এবং Node.js 20+ প্রয়োজন।

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) ব্যাকএন্ড (টার্মিনাল 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) ফ্রন্টএন্ড (টার্মিনাল 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

ব্রাউজারে <http://localhost:3121> খুলুন। Swagger ডকুমেন্টেশন: <http://localhost:8001/docs>।

---

## বৈশিষ্ট্য

- **জ্যোতিষ কুণ্ডলী** - ১৬টি বর্গচক্র (D1-D60), উত্তর বা দক্ষিণ ভারতীয় শৈলী
- **দৃক্ পঞ্জিকা** - তিথি · নক্ষত্র · যোগ · করণ · বার, সূর্য/চন্দ্র সময়, রাহু কাল, অভিজিৎ ইত্যাদি
- **মুহূর্ত অনুসন্ধান** - বিবাহ, গৃহপ্রবেশ, ব্যবসা, ভ্রমণ ইত্যাদির জন্য ১২০ দিন পর্যন্ত স্ক্যান
- **বিংশোত্তরী মহাদশা** - জন্ম থেকে ১২০ বছরের পূর্ণ চক্র (অন্তর্দশা + প্রত্যন্তর সহ)
- **অষ্টকবর্গ** - প্রতি গ্রহের ভিন্নাষ্টকবর্গ + সর্বাষ্টকবর্গ যোগফল
- **জৈমিনী** - চর কারক, কারকাংশ ও স্বাংশ চক্র
- **PDF রিপোর্ট** - ১৯ পৃষ্ঠার বহুভাষিক মুদ্রণযোগ্য রিপোর্ট
- **বহু-অয়নাংশ** - N.C. লাহিড়ী (ডিফল্ট), KP নতুন/পুরাতন, B.V. রমণ, KP খুল্লর, সায়ন, মনোজ
- **বহুভাষিক UI** - ১৫টি ভাষা, RTL ভাষাগুলির (আরবি / ফার্সি / হিব্রু) জন্য স্বয়ংক্রিয় দিক পরিবর্তন

---

## API

সমস্ত এন্ডপয়েন্ট `/api`-এর অধীনে। প্রোডাকশনে Nginx এগুলিকে একই অরিজিনে প্রক্সি করে।

| Method | Path                    | উদ্দেশ্য                                                |
|--------|-------------------------|------------------------------------------------------|
| POST   | `/api/calculate`        | পূর্ণ কুণ্ডলী (গ্রহ, ১৬ বর্গ, দশা, অষ্টকবর্গ, কারক, কালসর্প) |
| GET    | `/api/get-panchang`     | যেকোনো তারিখ + স্থানের দৃক্ পঞ্জিকা                   |
| GET    | `/api/ayanamsa-options` | উপলব্ধ অয়নাংশের তালিকা                               |
| GET    | `/api/muhurta-purposes` | মুহূর্তের উদ্দেশ্য বিভাগ                              |
| POST   | `/api/find-muhurta`     | একটি সময়সীমায় শুভ মুহূর্ত খুঁজুন                    |
| POST   | `/api/print-pdf`        | পূর্ণ PDF রিপোর্ট (১৫টি ভাষা)                        |

বিস্তারিত ডকুমেন্টেশন ইংরেজিতে:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md)।
স্থাপনার নির্দেশাবলীর জন্য মূল [`README.md`](../../README.md) দেখুন।

---

## লাইসেন্স

**ব্যাকএন্ড**: AGPL-3.0 · **ফ্রন্টএন্ড**: MIT

[Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD) থেকে অনুপ্রাণিত। জ্যোতির্গণিত [Swiss Ephemeris](https://www.astro.com/swisseph/) দ্বারা।
