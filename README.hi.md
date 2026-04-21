# दृक पंचांग

उच्च-परिशुद्धता हिंदू पंचांग कैलकुलेटर आधुनिक वेब इंटरफेस के साथ। किसी भी तिथि (5000 ईसा पूर्व - 5000 ईसवी) और स्थान के लिए पारंपरिक पंचांग की गणना करें।

⭐ **यदि आपको यह परियोजना उपयोगी लगती है, तो कृपया GitHub पर इसे स्टार दें!** यह दूसरों को इस उपकरण को खोजने में मदद करता है।

## त्वरित शुरुआत

```bash
# रिपॉजिटरी क्लोन करें
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# एक-कमांड सेटअप और रन
./setup.sh

# या मैन्युअल सेटअप:
# टर्मिनल 1 - बैकएंड
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python api.py

# टर्मिनल 2 - फ्रंटएंड
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8121" > .env.local
npm run dev
```

ब्राउज़र में http://localhost:3121 खोलें

## विशेषताएं

**पंचांग तत्व**: तिथि • नक्षत्र • योग • करण • वार
**समय**: सूर्योदय/सूर्यास्त • चंद्रोदय/चंद्रास्त • राहु काल • यम गंड • गुलिक • अभिजित
**खगोलीय**: ग्रहों की स्थिति • विंशोत्तरी दशा • अयनांश (लाहिरी)
**आधुनिक UI**: डार्क/लाइट मोड • 100,000+ स्थान • रेस्पॉन्सिव डिज़ाइन

## तकनीकी स्टैक

**बैकएंड**: Python • FastAPI • PySwisseph
**फ्रंटएंड**: Next.js 15 • React 19 • TypeScript • Tailwind CSS v4 • Shadcn/ui

## परियोजना संरचना

```
vedicpanchanga.com/
├── backend/                      # Python FastAPI बैकएंड (पोर्ट 8121)
│   ├── api.py                   # FastAPI एप्लिकेशन और एंडपॉइंट
│   ├── panchanga.py             # मुख्य पंचांग गणना इंजन
│   ├── vedic.py                 # वैदिक ज्योतिष उपयोगिता फ़ंक्शन
│   ├── vimsottari.py            # विम्शोत्तरी दशा गणना
│   ├── chart_generator.py       # जन्म कुंडली जनरेशन
│   ├── cities.json              # 100,000+ शहरों का डेटाबेस
│   ├── requirements.txt         # Python निर्भरताएं
│   └── README.md                # बैकएंड दस्तावेज़
│
├── frontend/                     # Next.js 15 फ्रंटएंड (पोर्ट 3121)
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx            # मुख्य डैशबोर्ड पृष्ठ
│   │   ├── layout.tsx          # रूट लेआउट
│   │   └── api/v1/             # रेट लिमिटिंग के साथ API प्रॉक्सी
│   ├── components/              # React कंपोनेंट
│   │   ├── panchanga-card.tsx  # मुख्य पंचांग प्रदर्शन
│   │   ├── city-dropdown.tsx   # स्थान खोज
│   │   ├── date-time-picker.tsx # तिथि/समय चयन
│   │   └── ui/                 # Shadcn/ui कंपोनेंट
│   ├── lib/                     # उपयोगिताएं और मुख्य तर्क
│   │   ├── api-client.ts       # बैकएंड API क्लाइंट
│   │   ├── store.ts            # Zustand स्टेट मैनेजमेंट
│   │   ├── types.ts            # TypeScript प्रकार
│   │   └── rate-limiter.ts     # रेट लिमिटिंग तर्क
│   └── hooks/                   # कस्टम React हुक
│
├── tests/                        # परीक्षण सूट
│   ├── test_api.py              # API परीक्षण
│   ├── test_timezones.py        # टाइमज़ोन परीक्षण
│   ├── stress_test_*.py         # लोड परीक्षण
│   └── *.sh                     # शेल परीक्षण स्क्रिप्ट
│
├── infra/                        # तैनाती
│   └── README-DEPLOYMENT.md     # तैनाती गाइड
│
├── API.md                        # API दस्तावेज़
├── CLAUDE.md                     # AI सहायक निर्देश
├── README.md                     # मुख्य दस्तावेज़ (अंग्रेज़ी)
├── README.hi.md                  # हिंदी दस्तावेज़
├── README.ta.md                  # तमिल दस्तावेज़
└── setup.sh                      # एक-कमांड सेटअप
```

## API दस्तावेज़

मुख्य एंडपॉइंट: `http://localhost:3121/api/v1/panchanga`
पूर्ण दस्तावेज़: [API.md](./API.md) देखें • बैकएंड दस्तावेज़: `http://localhost:8121/docs`


### ⭐ परियोजना का समर्थन करें
- इस रिपॉजिटरी को **स्टार करें**
- इसे दूसरों के साथ साझा करें
- समस्याओं की रिपोर्ट करें और सुधार सुझाएं

## श्रेय

सतीश बी डी द्वारा [दृक पंचांग](https://github.com/bdsatish/drik-panchanga) पर आधारित।
खगोलीय गणना के लिए Swiss Ephemeris का उपयोग करता है।

## टिप्पणी

यह अनुप्रयोग पारंपरिक हिंदू कैलेंडर गणना शैक्षणिक और व्यक्तिगत उपयोग के लिए प्रदान करता है। महत्वपूर्ण मुहूर्त या ज्योतिषीय निर्णयों के लिए, कृपया योग्य पंडितों से परामर्श करें।