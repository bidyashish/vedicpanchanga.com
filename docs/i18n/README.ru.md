# Ведическая Панчанга

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · **Русский** · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

Калькулятор Дрик-Панчанги с современным веб-интерфейсом. Рассчитывает традиционные элементы индуистской Панчанги, дробные карты (D1-D60), Вимшоттари Дашу, Аштакаваргу и благоприятные окна Мухурты для любой даты (5000 г. до н.э. - 5000 г. н.э.) и любого места.

**Сайт**: <https://vedicpanchanga.com>

⭐ Если этот проект полезен вам, пожалуйста, поставьте звезду репозиторию - это помогает другим найти его.

---

## Технический стек

| Слой    | Стек |
| ------- | ---- |
| Бэкенд  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` на `127.0.0.1:8001` |
| Фронтенд | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA с чистыми URL на порту 3121 |
| Инфра   | Cloudflare → Nginx (TLS, статический хостинг) → FastAPI loopback · опционально Prometheus + Grafana |

**Нет** базы данных. Все вычисления stateless; бэкенд ничего не сохраняет.

---

## Локальная установка

Требуются Python 3.10+ и Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) Бэкенд (терминал 1)
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) Фронтенд (терминал 2)
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Откройте <http://localhost:3121> в браузере. Swagger документация: <http://localhost:8001/docs>.

---

## Возможности

- **Джйотиша Кундали** - натальная карта с 16 дробными картами (D1-D60), северо- или южно-индийский стиль
- **Дрик Панчанга** - Титхи · Накшатра · Йога · Карана · Вара, время Солнца/Луны, Раху Кала, Абхиджит и др.
- **Поиск Мухурты** - сканирование до 120 дней для брака, новоселья, бизнеса, путешествий и т.д.
- **Вимшоттари Махадаша** - полный 120-летний планетарный цикл от рождения (с Антардашей и Пратьянтаром)
- **Аштакаварга** - Бхиннаштакаварга по планетам + суммы Сарваштакаварга
- **Джаймини** - Чара Караки, карты Каракамша и Свамша
- **PDF-отчёт** - 19-страничный многоязычный печатный отчёт
- **Мульти-аянамша** - NC Lahiri (по умолчанию), KP New/Old, BV Raman, KP Khullar, Сайана, Manoj
- **Многоязычный UI** - 15 языков, автоматическое переключение направления для RTL (арабский / персидский / иврит)

---

## API

Все эндпоинты находятся под `/api`. В продакшене Nginx проксирует их на тот же origin.

| Method | Path                    | Назначение                                          |
|--------|-------------------------|-----------------------------------------------------|
| POST   | `/api/calculate`        | Полная Кундали (планеты, 16 варг, даша, аштакаварга, караки, Калсарпа) |
| GET    | `/api/get-panchang`     | Дрик Панчанга для даты + места                      |
| GET    | `/api/ayanamsa-options` | Список доступных аянамш                             |
| GET    | `/api/muhurta-purposes` | Категории целей Мухурты                             |
| POST   | `/api/find-muhurta`     | Поиск благоприятных окон в диапазоне дат            |
| POST   | `/api/print-pdf`        | Полный PDF-отчёт (15 локалей)                       |

Подробная документация на английском:
[`backend/README.md`](../../backend/README.md) · [`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) · [`backend/tests/README.md`](../../backend/tests/README.md).
Инструкции по развёртыванию см. в основном [`README.md`](../../README.md).

---

## Лицензия

**Бэкенд**: AGPL-3.0 · **Фронтенд**: MIT

Основано на [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) (Satish BD). Астрономические расчёты через [Swiss Ephemeris](https://www.astro.com/swisseph/).
