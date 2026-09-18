# Vedic Panchanga

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · **Português** ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

Calculadora de Drik Panchang com interface web moderna. Calcula os elementos tradicionais do Panchang hindu, os 16 mapas divisionais (D1–D60), Vimshottari Daśā, Aṣṭakavarga e janelas auspiciosas de Muhūrta para qualquer data (5000 a.C. – 5000 d.C.) e qualquer localização.

**Site**: <https://vedicpanchanga.com>

⭐ Se este projeto te for útil, por favor dê uma estrela ao repositório — ajuda outras pessoas a encontrarem-no.

---

## Stack tecnológica

| Camada   | Tecnologia |
| -------- | ---------- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` em `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA com URLs limpas na porta 3121 |
| Infra    | Cloudflare → Nginx (TLS, host de ficheiros estáticos) → FastAPI loopback · Prometheus + Grafana opcionais |

**Sem base de dados** — todos os cálculos são sem estado e o backend não guarda nada.

---

## Executar localmente

Requer Python 3.10+ e Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) Backend (terminal 1) — FastAPI em :8001
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) Frontend (terminal 2) — servidor de desenvolvimento Vite em :3121
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Abre <http://localhost:3121>. Documentação Swagger: <http://localhost:8001/docs>.

---

## Funcionalidades

- **Jyotiṣa Kuṇḍalī** — mapa natal com 16 mapas divisionais (D1–D60), estilo norte-indiano ou sul-indiano
- **Drik Pañcāṅga diário** — Tithi · Nakṣatra · Yoga · Karaṇa · Vāra, nascer/pôr do Sol e Lua, Rāhu Kāla, Abhijit e mais
- **Localizador de Muhūrta** — varre até 120 dias para casamento, gṛha-praveśa, negócios, viagens etc.
- **Vimshottari Mahādaśā** — ciclo completo de 120 anos a partir do nascimento (inclui Antardaśā + Pratyantar)
- **Aṣṭakavarga** — Bhinnāṣṭakavarga por planeta + totais Sarvāṣṭakavarga
- **Sistema Jaimini** — Chara karakas, mapas Karakāṁśa e Swāṁśa
- **Relatório PDF** — relatório imprimível bilingue (English / हिन्दी) de 19 páginas
- **Multi-ayanāṁśa** — N.C. Lahiri (padrão), KP Novo/Antigo, B.V. Raman, KP Khullar, Sāyana, Manoj
- **UI bilingue** — English + हिन्दी, com fontes web Devanāgarī

---

## API

Todos os endpoints estão sob `/api`. Em produção, o Nginx fá-los proxy na mesma origem.

| Método | Caminho                 | Propósito                                                              |
|--------|-------------------------|------------------------------------------------------------------------|
| POST   | `/api/calculate`        | Mapa completo (planetas, 16 vargas, daśā, aṣṭakavarga, karakas, kālasarpa) |
| GET    | `/api/get-panchang`     | Drik Pañcāṅga para uma data + localização                              |
| GET    | `/api/ayanamsa-options` | Listar sistemas de ayanāṁśa disponíveis                                |
| GET    | `/api/muhurta-purposes` | Categorias de propósito do Muhūrta                                     |
| POST   | `/api/find-muhurta`     | Procurar janelas auspiciosas num intervalo de datas                    |
| POST   | `/api/print-pdf`        | Renderizar o relatório PDF completo (en/hi)                            |

Documentação detalhada por pasta (em inglês):
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md).
Para o guia completo de implantação, consulta o [`README.md`](../../README.md) raiz.

---

## Licença

**Backend**: AGPL-3.0 · **Frontend**: MIT

Baseado em [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) de Satish BD. Cálculos astronómicos via [Swiss Ephemeris](https://www.astro.com/swisseph/).
