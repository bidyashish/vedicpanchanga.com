# Vedic Panchanga

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · [日本語](README.ja.md) ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> **Français** · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

Calculateur de Drik Panchang doté d'une interface web moderne. Calcule les éléments traditionnels du Panchang hindou, les 16 cartes divisionnelles (D1–D60), Vimshottari Daśā, Aṣṭakavarga ainsi que les fenêtres Muhūrta favorables, pour n'importe quelle date (5000 av. J.-C. – 5000 ap. J.-C.) et n'importe quel lieu.

**Site** : <https://vedicpanchanga.com>

⭐ Si ce projet vous est utile, n'hésitez pas à mettre une étoile au dépôt — cela aide d'autres personnes à le découvrir.

---

## Stack technique

| Couche   | Technologie |
| -------- | ----------- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` (PDF) · `uvicorn` sur `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · SPA à URLs propres sur le port 3121 |
| Infra    | Cloudflare → Nginx (TLS, fichiers statiques) → FastAPI loopback · Prometheus + Grafana en option |

**Pas de base de données** — tous les calculs sont sans état et le backend ne persiste rien.

---

## Lancer en local

Nécessite Python 3.10+ et Node.js 20+.

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) Backend (terminal 1) — FastAPI sur :8001
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) Frontend (terminal 2) — serveur de dev Vite sur :3121
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Ouvrir <http://localhost:3121>. Documentation Swagger : <http://localhost:8001/docs>.

---

## Fonctionnalités

- **Jyotiṣa Kuṇḍalī** — thème natal avec 16 cartes divisionnelles (D1–D60), style nord-indien ou sud-indien
- **Drik Pañcāṅga quotidien** — Tithi · Nakṣatra · Yoga · Karaṇa · Vāra, lever/coucher du Soleil et de la Lune, Rāhu Kāla, Abhijit, etc.
- **Recherche de Muhūrta** — balaie jusqu'à 120 jours pour mariage, gṛha-praveśa, affaires, voyage, etc.
- **Vimshottari Mahādaśā** — cycle complet de 120 ans depuis la naissance (Antardaśā + Pratyantar inclus)
- **Aṣṭakavarga** — Bhinnāṣṭakavarga par planète + totaux Sarvāṣṭakavarga
- **Système Jaimini** — Chara karakas, cartes Karakāṁśa et Swāṁśa
- **Rapport PDF** — rapport imprimable bilingue (English / हिन्दी) de 19 pages
- **Multi-ayanāṁśa** — N.C. Lahiri (par défaut), KP Nouveau/Ancien, B.V. Raman, KP Khullar, Sāyana, Manoj
- **UI bilingue** — English + हिन्दी, avec polices web Devanāgarī

---

## API

Tous les endpoints sont sous `/api`. En production, Nginx les proxie sur la même origine.

| Méthode | Chemin                  | Rôle                                                                  |
|---------|-------------------------|-----------------------------------------------------------------------|
| POST    | `/api/calculate`        | Thème complet (planètes, 16 vargas, daśā, aṣṭakavarga, karakas, kālasarpa) |
| GET     | `/api/get-panchang`     | Drik Pañcāṅga pour une date + un lieu                                 |
| GET     | `/api/ayanamsa-options` | Lister les systèmes ayanāṁśa disponibles                              |
| GET     | `/api/muhurta-purposes` | Catégories d'objectifs Muhūrta                                        |
| POST    | `/api/find-muhurta`     | Rechercher les fenêtres favorables sur une plage de dates             |
| POST    | `/api/print-pdf`        | Générer le rapport PDF complet (en/hi)                                |

Documentation détaillée par dossier (en anglais) :
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md).
Pour le guide de déploiement complet, voir le [`README.md`](../../README.md) racine.

---

## Licence

**Backend** : AGPL-3.0 · **Frontend** : MIT

Basé sur [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) de Satish BD. Calculs astronomiques via [Swiss Ephemeris](https://www.astro.com/swisseph/).
