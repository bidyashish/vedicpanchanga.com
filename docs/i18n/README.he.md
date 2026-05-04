# פנצ'נגה ודית

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · **עברית**

מחשבון דריק פנצ'נגה עם ממשק אינטרנט מודרני. מחשב אלמנטים מסורתיים של פנצ'נגה הינדית, מפות חלוקה (D1-D60), וימשוטרי דשה, אשטקוורגה וחלונות מוהורתה מבורכים לכל תאריך (5000 לפנה"ס - 5000 לספירה) ולכל מיקום.

**אתר**: <https://vedicpanchanga.com>

⭐ אם הפרויקט הזה שימושי לך, אנא תן כוכב למאגר - זה עוזר לאחרים למצוא אותו.

---

## מחסנית טכנית

| שכבה   | מחסנית |
| ------ | ----- |
| באקאנד  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` ב-`127.0.0.1:8001` |
| פרונטאנד | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA עם URL נקי על פורט 3121 |
| תשתית   | Cloudflare ← Nginx (TLS, אחסון סטטי) ← FastAPI loopback · Prometheus + Grafana אופציונלי |

**אין** מסד נתונים. החישובים חסרי מצב; הבאקאנד לא שומר כלום.

---

## הגדרה מקומית

דורש Python 3.10+ ו-Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) באקאנד (טרמינל 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) פרונטאנד (טרמינל 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

פתח את <http://localhost:3121> בדפדפן. תיעוד Swagger: <http://localhost:8001/docs>.

---

## תכונות

- **ג'יוטישה קונדלי** - מפת לידה עם 16 מפות חלוקה (D1-D60), בסגנון צפון או דרום הודי
- **דריק פנצ'נגה** - תיתי · נקשטרה · יוגה · קראן · ורה, זמני שמש/ירח, ראהו קאלא, אבהיג'ית ועוד
- **מאתר מוהורתה** - סריקה של עד 120 ימים לחתונה, חניכת בית, עסקים, נסיעות וכו'
- **וימשוטרי מהדשה** - מחזור פלנטרי מלא של 120 שנה מהלידה (עם אנטרדשה ופרטיאנטר)
- **אשטקוורגה** - בהינשטקוורגה לכל כוכב + סך סרבשטקוורגה
- **ג'יימיני** - צ'רה קרקה, מפות קרקמסה וסומסה
- **דוח PDF** - דוח רב-לשוני בן 19 עמודים להדפסה
- **רב-איאנמסה** - NC Lahiri (ברירת מחדל), KP New/Old, BV Raman, KP Khullar, סייאנה, מנוג
- **ממשק רב-לשוני** - 15 שפות, החלפת כיוון אוטומטית לשפות RTL (ערבית / פרסית / עברית)

---

## API

כל נקודות הקצה תחת `/api`. בייצור, Nginx מבצע פרוקסי שלהן לאותו מקור.

| Method | Path                    | מטרה                                                |
|--------|-------------------------|---------------------------------------------------|
| POST   | `/api/calculate`        | קונדלי מלא (כוכבים, 16 ורגות, דשה, אשטקוורגה, קרקות, קלסרפה) |
| GET    | `/api/get-panchang`     | דריק פנצ'נגה לתאריך + מיקום                        |
| GET    | `/api/ayanamsa-options` | רשימת מערכות איאנמסה זמינות                       |
| GET    | `/api/muhurta-purposes` | קטגוריות מטרה של מוהורתה                          |
| POST   | `/api/find-muhurta`     | סריקת טווח תאריכים לחלונות מבורכים                |
| POST   | `/api/print-pdf`        | דוח PDF מלא (15 שפות)                              |

תיעוד מפורט באנגלית:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md).
להוראות פריסה, ראה את [`README.md`](../../README.md) הראשי.

---

## רישיון

**באקאנד**: AGPL-3.0 · **פרונטאנד**: MIT

מבוסס על [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD). חישובים אסטרונומיים באמצעות [Swiss Ephemeris](https://www.astro.com/swisseph/).
