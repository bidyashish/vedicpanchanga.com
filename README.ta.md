# வேத பஞ்சாங்கம்


திருக் பஞ்சாங்க கணிப்பான் நவீன வலை இடைமுகத்துடன். எந்த தேதி (கி.மு. 5000 - கி.பி. 5000) மற்றும் இடத்திற்கும் பாரம்பரிய பஞ்சாங்கத்தை கணக்கிடுங்கள்.

⭐ **இந்த திட்டம் உங்களுக்கு பயனுள்ளதாக இருந்தால், GitHub இல் நட்சத்திரம் கொடுக்கவும்!** இது மற்றவர்களுக்கு இந்த கருவியை கண்டுபிடிக்க உதவுகிறது.

## விரைவு தொடக்கம்

```bash
# களஞ்சியத்தை நகலெடுக்கவும்
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# அல்லது கைமுறை அமைப்பு:
# முனையம் 1 - பின்தளம் (போர்ட் 8001)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
source venv/bin/activate.fish
pip install -r requirements.txt
python api.py

# முனையம் 2 - முன்தளம் (போர்ட் 3121)
cd frontend
npm install
# .env.local விருப்பத்தேர்வு — இயல்புநிலை http://localhost:8001
npm run dev
```

http://localhost:3121 ஐ உலாவியில் திறக்கவும்

## அம்சங்கள்

**பஞ்சாங்க கூறுகள்**: திதி • நட்சத்திரம் • யோகம் • கரணம் • வாரம்
**நேரங்கள்**: சூரிய உதயம்/அஸ்தமனம் • சந்திர உதயம்/அஸ்தமனம் • ராகு காலம் • யம கண்டம் • குளிகை • அபிஜித்
**வானியல்**: கிரக நிலைகள் • விம்சோத்தரி தசை • அயனாம்சம் (லாஹிரி)
**நவீன UI**: இருள்/ஒளி முறை • 100,000+ இடங்கள் • பதிலளிக்கும் வடிவமைப்பு

## தொழில்நுட்ப அடுக்கு

**பின்தளம்**: Python • FastAPI • PySwissEph
**முன்தளம்**: Next.js 15 • React 19 • TypeScript • Tailwind CSS v4 • Shadcn/ui

## திட்ட அமைப்பு

```
vedicpanchanga.com/
├── backend/          # Python FastAPI சேவையகம் (போர்ட் 8001)
├── frontend/         # Next.js 15 பயன்பாடு (போர்ட் 3121)
├── infra/            # வரிசைப்படுத்தல் ஸ்கிரிப்ட்கள், systemd யூனிட்கள், nginx, கண்காணிப்பு
├── tests/            # API, நேர மண்டலம், சுமை, மற்றும் உற்பத்தி சோதனைகள்
├── memory/           # PRD மற்றும் திட்ட சூழல்
├── API.md            # API ஆவணம்
├── AGENTS.md         # AI உதவியாளர் வழிமுறைகள்
└── README.md         # இந்த கோப்பு
```

## உள்கட்டமைப்பு மற்றும் வரிசைப்படுத்தல்

### கட்டமைப்பு

```
இணையம் → Cloudflare (DDoS) → Nginx (TLS முடிவு) → Next.js (:3121) → FastAPI (:8001, localhost மட்டும்)
                                                    ↕
                                          Prometheus + Grafana (கண்காணிப்பு)
```

### புதிய VPS இல் வரிசைப்படுத்தல் (Ubuntu 20.04+)

```bash
# 1. நகலெடுத்து அமைக்கவும் (ஒரே கட்டளை)
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga && sudo bash infra/setup-vps.sh

# 2. SSL சான்றிதழ்
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com

# 3. தானியங்கு புதுப்பிப்புகள் (விருப்பத்தேர்வு, ஒவ்வொரு 6 மணி நேரமும்)
bash infra/setup-cron.sh
```

அவ்வளவுதான். அமைப்பு ஸ்கிரிப்ட் Python venv, Node.js, Nginx, systemd சேவைகள், மற்றும் ஃபயர்வாலை கையாளுகிறது.

### பாதுகாப்பு கடினப்படுத்தல் (உள்ளமைக்கப்பட்டது)

| அடுக்கு | என்ன கட்டமைக்கப்பட்டுள்ளது |
|---|---|
| **ஃபயர்வால் (UFW)** | போர்ட்கள் 22, 80, 443 மட்டும் திறந்திருக்கும்; பின்தள போர்ட் 8001 வெளிப்புறமாக தடுக்கப்பட்டது |
| **Nginx** | HTTP→HTTPS திசைமாற்றம், HSTS, X-Frame-Options, CSP, XSS பாதுகாப்பு |
| **TLS** | TLSv1.2+ மட்டும், வலுவான சைஃபர்கள், Certbot மூலம் OCSP ஸ்டேப்லிங் |
| **பின்தளம்** | `127.0.0.1` இல் மட்டும் இணைப்பு — இணையத்தில் வெளிப்படாது |
| **IP அணுகல்** | நேரடி IP அணுகல் `444` திருப்பும் (இணைப்பு துண்டிப்பு) |
| **தானியங்கு புதுப்பிப்பு** | Cron சமீபத்திய குறியீட்டை இழுக்கிறது, கட்டமைக்கிறது, மறுதொடக்கம் செய்கிறது |

> **உற்பத்திக்கு முன்**: Grafana இயல்புநிலை கடவுச்சொற்களை மாற்றவும், கண்காணிப்பு போர்ட்களை (9090/3002) உங்கள் IP க்கு கட்டுப்படுத்தவும், OS இணைப்புகளுக்கு `unattended-upgrades` இயக்கவும்.

### தினசரி செயல்பாடுகள்

```bash
# நிலையை சரிபார்க்கவும்
sudo systemctl status panchanga-backend panchanga-frontend

# பதிவுகளை பார்க்கவும்
sudo journalctl -u panchanga-backend -f

# கைமுறை மறுவரிசைப்படுத்தல்
bash infra/update-deploy.sh

# மறுதொடக்கம்
sudo systemctl restart panchanga-backend panchanga-frontend
```



## சோதனை

```bash
python tests/test_api.py                 # API சோதனைகள்
python tests/test_timezones.py            # நேர மண்டல கணக்கீடுகள்
python tests/stress_test_panchanga.py     # சுமை சோதனை
./tests/test_production_api.sh            # உற்பத்தி ஸ்மோக் டெஸ்ட்
```

## API ஆவணம்

முக்கிய முனைப்புள்ளி: `http://localhost:3121/api/v1/panchanga`  
முழு ஆவணங்கள்: [API.md](./API.md) பார்க்கவும் • ஊடாடும் ஆவணங்கள்: `http://localhost:8001/docs`

## உரிமம்

**பின்தளம்**: AGPL-3.0 • **முன்தளம்**: MIT

## பங்களிப்பு

பங்களிப்புகளை வரவேற்கிறோம்! நீங்கள் எவ்வாறு உதவலாம் என்பது இங்கே:

### 🐛 பிழை கண்டீர்களா? / ### 💡 அம்ச கோரிக்கை?
[ஒரு சிக்கலை திறக்கவும்](https://github.com/bidyashish/vedicpanchanga.com/issues/new) சிக்கல் மற்றும் மறுஉருவாக்க படிகளின் விவரங்களுடன்.

### ⭐ திட்டத்தை ஆதரிக்கவும்
- மற்றவர்கள் கண்டுபிடிக்க உதவ இந்த களஞ்சியத்தை **நட்சத்திரம் கொடுக்கவும்**
- மற்றவர்களுடன் பகிர்ந்துகொள்ளுங்கள்
- சிக்கல்களை புகாரளிக்கவும் மற்றும் மேம்பாடுகளை பரிந்துரைக்கவும்

## நட்சத்திர வரலாறு

[![Star History Chart](https://api.star-history.com/svg?repos=bidyashish/vedicpanchanga.com&type=Date)](https://star-history.com/#bidyashish/vedicpanchanga.com&Date)

## பங்களிப்பாளர்கள்

இந்த திட்டத்தை சிறப்பாக்க உதவிய அனைத்து பங்களிப்பாளர்களுக்கும் நன்றி!

[![Contributors](https://contrib.rocks/image?repo=bidyashish/vedicpanchanga.com)](https://github.com/bidyashish/vedicpanchanga.com/graphs/contributors)

## பிரபலமானவை

<a href="https://github.com/trending/python?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-Python-blue?style=for-the-badge&logo=github" alt="Trending Python">
</a>
<a href="https://github.com/trending/javascript?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-JavaScript-yellow?style=for-the-badge&logo=github" alt="Trending JavaScript">
</a>

## நன்றி

சதீஷ் பி டி யின் [திருக் பஞ்சாங்கம்](https://github.com/bdsatish/drik-panchanga) அடிப்படையில்.
வானியல் கணக்கீடுகளுக்கு Swiss Ephemeris பயன்படுத்துகிறது.