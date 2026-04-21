# திருக் பஞ்சாங்கம்

நவீன வலை இடைமுகத்துடன் உயர் துல்லியமான இந்து பஞ்சாங்க கணிப்பான். எந்த தேதி (கி.மு. 5000 - கி.பி. 5000) மற்றும் இடத்திற்கும் பாரம்பரிய பஞ்சாங்கத்தை கணக்கிடுங்கள்.

⭐ **இந்த திட்டம் உங்களுக்கு பயனுள்ளதாக இருந்தால், GitHub இல் நட்சத்திரம் கொடுக்கவும்!** இது மற்றவர்களுக்கு இந்த கருவியை கண்டுபிடிக்க உதவுகிறது.

## விரைவு தொடக்கம்

```bash
# களஞ்சியத்தை நகலெடுக்கவும்
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# ஒரு-கட்டளை அமைப்பு மற்றும் இயக்கம்
./setup.sh

# அல்லது கைமுறை அமைப்பு:
# முனையம் 1 - பின்தளம்
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python api.py

# முனையம் 2 - முன்தளம்
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8121" > .env.local
npm run dev
```

http://localhost:3121 ஐ உலாவியில் திறக்கவும்

## அம்சங்கள்

**பஞ்சாங்க கூறுகள்**: திதி • நட்சத்திரம் • யோகம் • கரணம் • வாரம்
**நேரங்கள்**: சூரிய உதயம்/அஸ்தமனம் • சந்திர உதயம்/அஸ்தமனம் • ராகு காலம் • யம கண்டம் • குளிகை • அபிஜித்
**வானியல்**: கிரக நிலைகள் • விம்சோத்தரி தசை • அயனாம்சம் (லாஹிரி)
**நவீன UI**: இருள்/ஒளி முறை • 100,000+ இடங்கள் • பதிலளிக்கும் வடிவமைப்பு

## தொழில்நுட்ப அடுக்கு

**பின்தளம்**: Python • FastAPI • PySwisseph
**முன்தளம்**: Next.js 15 • React 19 • TypeScript • Tailwind CSS v4 • Shadcn/ui

## திட்ட அமைப்பு

```
vedicpanchanga.com/
├── backend/                      # Python FastAPI பின்தளம் (போர்ட் 8121)
│   ├── api.py                   # FastAPI பயன்பாடு மற்றும் முனைப்புள்ளிகள்
│   ├── panchanga.py             # முக்கிய பஞ்சாங்க கணக்கீட்டு இயந்திரம்
│   ├── vedic.py                 # வேத ஜோதிட பயன்பாட்டு செயல்பாடுகள்
│   ├── vimsottari.py            # விம்சோத்தரி தசா கணக்கீடுகள்
│   ├── chart_generator.py       # ஜாதக உருவாக்கம்
│   ├── cities.json              # 100,000+ நகரங்கள் தரவுத்தளம்
│   ├── requirements.txt         # Python சார்புகள்
│   └── README.md                # பின்தள ஆவணம்
│
├── frontend/                     # Next.js 15 முன்தளம் (போர்ட் 3121)
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx            # முக்கிய டாஷ்போர்டு பக்கம்
│   │   ├── layout.tsx          # மூல அமைப்பு
│   │   └── api/v1/             # வீத வரம்புடன் API ப்ராக்ஸி
│   ├── components/              # React கூறுகள்
│   │   ├── panchanga-card.tsx  # முக்கிய பஞ்சாங்க காட்சி
│   │   ├── city-dropdown.tsx   # இடம் தேடல்
│   │   ├── date-time-picker.tsx # தேதி/நேரம் தேர்வு
│   │   └── ui/                 # Shadcn/ui கூறுகள்
│   ├── lib/                     # பயன்பாடுகள் மற்றும் முக்கிய தர்க்கம்
│   │   ├── api-client.ts       # பின்தள API கிளையன்ட்
│   │   ├── store.ts            # Zustand நிலை மேலாண்மை
│   │   ├── types.ts            # TypeScript வகைகள்
│   │   └── rate-limiter.ts     # வீத வரம்பு தர்க்கம்
│   └── hooks/                   # தனிப்பயன் React ஹூக்ஸ்
│
├── tests/                        # சோதனை தொகுப்பு
│   ├── test_api.py              # API சோதனைகள்
│   ├── test_timezones.py        # நேர மண்டல சோதனைகள்
│   ├── stress_test_*.py         # சுமை சோதனைகள்
│   └── *.sh                     # ஷெல் சோதனை ஸ்கிரிப்ட்கள்
│
├── infra/                        # வரிசைப்படுத்தல்
│   └── README-DEPLOYMENT.md     # வரிசைப்படுத்தல் வழிகாட்டி
│
├── API.md                        # API ஆவணம்
├── CLAUDE.md                     # AI உதவியாளர் வழிமுறைகள்
├── README.md                     # முக்கிய ஆவணம் (ஆங்கிலம்)
├── README.hi.md                  # ஹிந்தி ஆவணம்
├── README.ta.md                  # தமிழ் ஆவணம்
└── setup.sh                      # ஒரு-கட்டளை அமைப்பு
```

## API ஆவணம்

முக்கிய முனைப்புள்ளி: `http://localhost:3121/api/v1/panchanga`
முழு ஆவணங்கள்: [API.md](./API.md) பார்க்கவும் • பின்தள ஆவணங்கள்: `http://localhost:8121/docs`


## நன்றி

சதீஷ் பி டி யின் [திருக் பஞ்சாங்கம்](https://github.com/bdsatish/drik-panchanga) அடிப்படையில்.
வானியல் கணக்கீடுகளுக்கு Swiss Ephemeris பயன்படுத்துகிறது.