# Vedic Panchanga


Drik Panchang calculator with modern web interface. Calculate traditional Panchanga for any date (5000 BCE - 5000 CE) and location.

⭐ **If you find this project useful, please consider giving it a star on GitHub!** It helps others discover this tool.

## Quick Start

```bash
# Clone repository
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# Or manual setup:
# Terminal 1 - Backend (runs on port 8121)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python api.py

# Terminal 2 - Frontend (runs on port 3121)
cd frontend
npm install
# .env.local is optional - defaults to http://localhost:8121
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
├── backend/          # Python FastAPI server (port 8121)
├── frontend/         # Next.js 15 application (port 3121)
├── infra/           # Deployment scripts and infrastructure
├── tests/           # Testing and verification scripts
├── API.md           # API documentation
├── CLAUDE.md        # AI assistant instructions
└── README.md        # This file
```

## Testing

The `tests/` directory contains various testing and verification scripts:

```bash
# API Testing
python tests/test_api.py                    # Basic API tests
./tests/verify_apis.sh                      # Verify API endpoints

# Timezone Testing
python tests/test_timezones.py              # Test timezone calculations
./tests/test_all_timezones.sh               # Test all timezone scenarios
./tests/verify_timezones.py                 # Verify timezone accuracy

# Load Testing
python tests/stress_test_panchanga.py       # Stress test calculations
python tests/stress_test_rate_limited.py    # Test rate limiting

# Production Testing
./tests/test_production_api.sh              # Test production deployment
```

## API Documentation

Main endpoint: `http://localhost:3121/api/v1/panchanga`
Full docs: See [API.md](./API.md) • Backend docs: `http://localhost:8121/docs`

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