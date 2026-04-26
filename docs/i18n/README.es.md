# Vedic Panchanga

> [English](../../README.md) · [हिन्दी](../../README.hi.md) · [தமிழ்](../../README.ta.md) ·
> [中文](README.zh.md) · [日本語](README.ja.md) · **Español** ·
> [Deutsch](README.de.md) · [Português](README.pt.md) · [Français](README.fr.md)

Calculador de Drik Panchang con interfaz web moderna. Calcula los elementos tradicionales del Panchang hindú, los 16 cuadros divisionales (D1–D60), Vimshottari Daśā, Aṣṭakavarga y ventanas auspiciosas de Muhūrta para cualquier fecha (5000 a. C. – 5000 d. C.) y ubicación.

**Sitio**: <https://vedicpanchanga.com>

⭐ Si este proyecto te resulta útil, por favor dale una estrella al repositorio — ayuda a que otras personas lo encuentren.

---

## Stack tecnológico

| Capa     | Tecnología |
| -------- | ---------- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` en `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA con URLs limpias en el puerto 3121 |
| Infra    | Cloudflare → Nginx (TLS, host de archivos estáticos) → FastAPI loopback · Prometheus + Grafana opcional |

**Sin base de datos** — todos los cálculos son sin estado y el backend no persiste nada.

---

## Ejecutar localmente

Requiere Python 3.10+ y Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) Backend (terminal 1) — FastAPI en :8001
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) Frontend (terminal 2) — servidor de desarrollo Vite en :3121
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Abre <http://localhost:3121>. Documentación Swagger: <http://localhost:8001/docs>.

---

## Funcionalidades

- **Jyotiṣa Kuṇḍalī** — carta natal con 16 cuadros divisionales (D1–D60), estilo norte o sur de la India
- **Drik Pañcāṅga diario** — Tithi · Nakṣatra · Yoga · Karaṇa · Vāra, salida/puesta de Sol y Luna, Rāhu Kāla, Abhijit, etc.
- **Buscador de Muhūrta** — escanea hasta 120 días para boda, gṛha-praveśa, negocios, viajes y más
- **Vimshottari Mahādaśā** — ciclo completo de 120 años desde el nacimiento (incluye Antardaśā + Pratyantar)
- **Aṣṭakavarga** — Bhinnāṣṭakavarga por planeta + totales Sarvāṣṭakavarga
- **Sistema Jaimini** — Chara karakas, cartas Karakāṁśa y Swāṁśa
- **Reporte PDF** — informe imprimible bilingüe (English / हिन्दी) de 19 páginas
- **Multi-ayanāṁśa** — N.C. Lahiri (predeterminado), KP nuevo/antiguo, B.V. Raman, KP Khullar, Sāyana, Manoj
- **UI bilingüe** — English + हिन्दी, con fuentes web Devanāgarī

---

## API

Todos los endpoints están bajo `/api`. En producción Nginx los proxy-pasa al mismo origen.

| Método | Ruta                    | Propósito                                                              |
|--------|-------------------------|------------------------------------------------------------------------|
| POST   | `/api/calculate`        | Carta completa (planetas, 16 vargas, daśā, aṣṭakavarga, karakas, kālasarpa) |
| GET    | `/api/get-panchang`     | Drik Pañcāṅga para una fecha + ubicación                                |
| GET    | `/api/ayanamsa-options` | Listar los sistemas de ayanāṁśa disponibles                            |
| GET    | `/api/muhurta-purposes` | Categorías de propósito para Muhūrta                                   |
| POST   | `/api/find-muhurta`     | Escanear un rango de fechas para ventanas auspiciosas                  |
| POST   | `/api/print-pdf`        | Renderizar el reporte PDF completo (en/hi)                              |

Documentación detallada por carpeta (en inglés):
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md).
Para la guía completa de despliegue, consulta el [`README.md`](../../README.md) raíz.

---

## Licencia

**Backend**: AGPL-3.0 · **Frontend**: MIT

Basado en [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) de Satish BD. Cálculos astronómicos vía [Swiss Ephemeris](https://www.astro.com/swisseph/).
