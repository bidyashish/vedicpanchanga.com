# Vedic Panchanga


Drik Panchang calculator with modern web interface. Calculate traditional Panchanga for any date (5000 BCE - 5000 CE) and location.

⭐ **If you find this project useful, please consider giving it a star on GitHub!** It helps others discover this tool.

## Quick Start

```bash
# Clone repository
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# Or manual setup:
# Terminal 1 - Backend (runs on port 8001)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cd backend && source venv/bin/activate && uvicorn server:app --host 127.0.0.1 --port 8001 2>&1

# Terminal 2 - Frontend (runs on port 3121)
cd frontend
npm install
# .env.local is optional - defaults to http://localhost:8001
npm run dev
```

Open http://localhost:3121

## Features

**Panchanga Elements**: Tithi • Nakshatra • Yoga • Karana • Vaara
**Timings**: Sunrise/Sunset • Moonrise/Moonset • Rahu Kala • Yama Ganda • Gulika • Abhijit
**Astronomical**: Planetary positions • Vimsottari Dasha • Ayanamsha (Lahiri)
**Modern UI**: Dark/Light mode • 100,000+ locations • Responsive design

## Tech Stack

**Backend**: Python • FastAPI • PySwisseph
**Frontend**: Next.js 15 • React 19 • TypeScript • Tailwind CSS v4 • Shadcn/ui

## Project Structure

```
vedicpanchanga.com/
├── backend/          # Python FastAPI server (port 8001)
├── frontend/         # Next.js 15 application (port 3121)
├── infra/            # Deployment scripts, systemd units, nginx, monitoring
├── tests/            # API, timezone, load, and production tests
├── memory/           # PRD and project context
├── API.md            # API documentation
├── AGENTS.md         # AI agent instructions
└── README.md         # This file
```

## Infrastructure & Deployment

### Architecture

```
Internet → Cloudflare (DDoS) → Nginx (TLS termination) → Next.js (:3121) → FastAPI (:8001, localhost-only)
                                                        ↕
                                              Prometheus + Grafana (monitoring)
```

### Deploy to a Fresh VPS (Ubuntu 20.04+)

```bash
# 1. Clone & setup (one command)
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga && sudo bash infra/setup-vps.sh

# 2. SSL certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com

# 3. Auto-updates (optional, every 6h)
bash infra/setup-cron.sh
```

That's it. The setup script handles Python venv, Node.js, Nginx, systemd services, and the firewall.

### Security Hardening (built-in)

| Layer | What's configured |
|---|---|
| **Firewall (UFW)** | Only ports 22, 80, 443 open; backend port 8001 blocked externally |
| **Nginx** | HTTP→HTTPS redirect, HSTS, X-Frame-Options, CSP, XSS protection |
| **TLS** | TLSv1.2+ only, strong ciphers, OCSP stapling via Certbot |
| **Backend** | Binds to `127.0.0.1` only — never exposed to the internet |
| **IP access** | Direct IP access returns `444` (connection dropped) |
| **Auto-updates** | Cron pulls latest code, rebuilds, restarts — zero-downtime |

> **Before production**: Change default Grafana passwords, restrict monitoring ports (9090/3002) to your IP, and enable `unattended-upgrades` for OS patches.

### Daily Operations

```bash
# Check status
sudo systemctl status panchanga-backend panchanga-frontend

# View logs
sudo journalctl -u panchanga-backend -f

# Manual redeploy
bash infra/update-deploy.sh

# Restart
sudo systemctl restart panchanga-backend panchanga-frontend
```

Full deployment docs → [infra/README-DEPLOYMENT.md](./infra/README-DEPLOYMENT.md)  
Full infra reference → [infra/README-INFRA.md](./infra/README-INFRA.md)

## Testing

```bash
python tests/test_api.py                 # API tests
python tests/test_timezones.py            # Timezone calculations
python tests/stress_test_panchanga.py     # Load testing
./tests/test_production_api.sh            # Production smoke test
```

## API Documentation

Main endpoint: `http://localhost:3121/api/v1/panchanga`  
Full docs: See [API.md](./API.md) • Interactive docs: `http://localhost:8001/docs`

## License

**Backend**: AGPL-3.0 • **Frontend**: MIT

## Contributing

We welcome contributions! Here's how you can help:

### 🐛 Found a Bug?/### 💡 Have a Feature Request?
[Open an issue](https://github.com/bidyashish/vedicpanchanga.com/issues/new) with details about the problem and steps to reproduce.


### ⭐ Support the Project
- **Star this repository** to help others find it
- Share it with others who might find it useful
- Report issues and suggest improvements

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=bidyashish/vedicpanchanga.com&type=Date)](https://star-history.com/#bidyashish/vedicpanchanga.com&Date)

## Contributors

Thanks to all the contributors who have helped make this project better!

[![Contributors](https://contrib.rocks/image?repo=bidyashish/vedicpanchanga.com)](https://github.com/bidyashish/vedicpanchanga.com/graphs/contributors)

## Trending

<a href="https://github.com/trending/python?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-Python-blue?style=for-the-badge&logo=github" alt="Trending Python">
</a>
<a href="https://github.com/trending/javascript?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-JavaScript-yellow?style=for-the-badge&logo=github" alt="Trending JavaScript">
</a>

## Credits

Based on [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) by Satish BD.
Uses Swiss Ephemeris for astronomical calculations.