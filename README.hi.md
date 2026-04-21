# वैदिक पंचांग


दृक पंचांग कैलकुलेटर आधुनिक वेब इंटरफेस के साथ। किसी भी तिथि (5000 ईसा पूर्व - 5000 ईसवी) और स्थान के लिए पारंपरिक पंचांग की गणना करें।

⭐ **यदि आपको यह परियोजना उपयोगी लगती है, तो कृपया GitHub पर इसे स्टार दें!** यह दूसरों को इस उपकरण को खोजने में मदद करता है।

## त्वरित शुरुआत

```bash
# रिपॉजिटरी क्लोन करें
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# या मैन्युअल सेटअप:
# टर्मिनल 1 - बैकएंड (पोर्ट 8001)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python api.py

# टर्मिनल 2 - फ्रंटएंड (पोर्ट 3121)
cd frontend
npm install
# .env.local वैकल्पिक है — डिफ़ॉल्ट http://localhost:8001
npm run dev
```

ब्राउज़र में http://localhost:3121 खोलें

## विशेषताएं

**पंचांग तत्व**: तिथि • नक्षत्र • योग • करण • वार
**समय**: सूर्योदय/सूर्यास्त • चंद्रोदय/चंद्रास्त • राहु काल • यम गंड • गुलिक • अभिजित
**खगोलीय**: ग्रहों की स्थिति • विम्शोत्तरी दशा • अयनांश (लाहिरी)
**आधुनिक UI**: डार्क/लाइट मोड • 100,000+ स्थान • रेस्पॉन्सिव डिज़ाइन

## तकनीकी स्टैक

**बैकएंड**: Python • FastAPI • PySwissEph
**फ्रंटएंड**: Next.js 15 • React 19 • TypeScript • Tailwind CSS v4 • Shadcn/ui

## परियोजना संरचना

```
vedicpanchanga.com/
├── backend/          # Python FastAPI सर्वर (पोर्ट 8001)
├── frontend/         # Next.js 15 एप्लिकेशन (पोर्ट 3121)
├── infra/            # तैनाती स्क्रिप्ट, systemd यूनिट, nginx, मॉनिटरिंग
├── tests/            # API, टाइमज़ोन, लोड, और प्रोडक्शन परीक्षण
├── memory/           # PRD और परियोजना संदर्भ
├── API.md            # API दस्तावेज़
├── AGENTS.md         # AI एजेंट निर्देश
└── README.md         # यह फ़ाइल
```

## अवसंरचना और तैनाती

### आर्किटेक्चर

```
इंटरनेट → Cloudflare (DDoS) → Nginx (TLS समाप्ति) → Next.js (:3121) → FastAPI (:8001, केवल localhost)
                                                      ↕
                                            Prometheus + Grafana (मॉनिटरिंग)
```

### नए VPS पर तैनाती (Ubuntu 20.04+)

```bash
# 1. क्लोन और सेटअप (एक कमांड)
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga && sudo bash infra/setup-vps.sh

# 2. SSL प्रमाणपत्र
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com

# 3. स्वतः अपडेट (वैकल्पिक, हर 6 घंटे)
bash infra/setup-cron.sh
```

बस इतना ही। सेटअप स्क्रिप्ट Python venv, Node.js, Nginx, systemd सेवाएं, और फ़ायरवॉल सब संभालती है।

### सुरक्षा सख्ती (अंतर्निहित)

| परत | क्या कॉन्फ़िगर है |
|---|---|
| **फ़ायरवॉल (UFW)** | केवल पोर्ट 22, 80, 443 खुले; बैकएंड पोर्ट 8001 बाहर से अवरुद्ध |
| **Nginx** | HTTP→HTTPS रीडायरेक्ट, HSTS, X-Frame-Options, CSP, XSS सुरक्षा |
| **TLS** | केवल TLSv1.2+, मजबूत सिफर, Certbot द्वारा OCSP स्टेपलिंग |
| **बैकएंड** | केवल `127.0.0.1` पर बाइंड — कभी इंटरनेट पर एक्सपोज़ नहीं |
| **IP एक्सेस** | सीधी IP एक्सेस `444` लौटाती है (कनेक्शन ड्रॉप) |
| **स्वतः अपडेट** | Cron नवीनतम कोड खींचता है, बनाता है, पुनरारंभ करता है |

> **प्रोडक्शन से पहले**: Grafana डिफ़ॉल्ट पासवर्ड बदलें, मॉनिटरिंग पोर्ट (9090/3002) अपने IP तक सीमित करें, और OS पैच के लिए `unattended-upgrades` सक्षम करें।

### दैनिक संचालन

```bash
# स्थिति जांचें
sudo systemctl status panchanga-backend panchanga-frontend

# लॉग देखें
sudo journalctl -u panchanga-backend -f

# मैन्युअल पुनर्तैनाती
bash infra/update-deploy.sh

# पुनरारंभ
sudo systemctl restart panchanga-backend panchanga-frontend
```



## परीक्षण

```bash
python tests/test_api.py                 # API परीक्षण
python tests/test_timezones.py            # टाइमज़ोन गणना
python tests/stress_test_panchanga.py     # लोड परीक्षण
./tests/test_production_api.sh            # प्रोडक्शन स्मोक टेस्ट
```

## API दस्तावेज़

मुख्य एंडपॉइंट: `http://localhost:3121/api/v1/panchanga`
पूर्ण दस्तावेज़: [API.md](./API.md) देखें • इंटरैक्टिव दस्तावेज़: `http://localhost:8001/docs`

## लाइसेंस

**बैकएंड**: AGPL-3.0 • **फ्रंटएंड**: MIT

## योगदान

हम योगदान का स्वागत करते हैं! यहाँ बताया गया है कि आप कैसे मदद कर सकते हैं:

### 🐛 बग मिला? / ### 💡 फ़ीचर अनुरोध?
[एक इश्यू खोलें](https://github.com/bidyashish/vedicpanchanga.com/issues/new) समस्या के विवरण और पुनरुत्पादन चरणों के साथ।

### ⭐ परियोजना का समर्थन करें
- इस रिपॉजिटरी को **स्टार करें** ताकि दूसरे इसे खोज सकें
- इसे दूसरों के साथ साझा करें
- समस्याओं की रिपोर्ट करें और सुधार सुझाएं

## स्टार इतिहास

[![Star History Chart](https://api.star-history.com/svg?repos=bidyashish/vedicpanchanga.com&type=Date)](https://star-history.com/#bidyashish/vedicpanchanga.com&Date)

## योगदानकर्ता

इस परियोजना को बेहतर बनाने में मदद करने वाले सभी योगदानकर्ताओं को धन्यवाद!

[![Contributors](https://contrib.rocks/image?repo=bidyashish/vedicpanchanga.com)](https://github.com/bidyashish/vedicpanchanga.com/graphs/contributors)

## ट्रेंडिंग

<a href="https://github.com/trending/python?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-Python-blue?style=for-the-badge&logo=github" alt="Trending Python">
</a>
<a href="https://github.com/trending/javascript?since=daily" target="_blank">
  <img src="https://img.shields.io/badge/Trending-JavaScript-yellow?style=for-the-badge&logo=github" alt="Trending JavaScript">
</a>

## श्रेय

सतीश बी डी द्वारा [दृक पंचांग](https://github.com/bdsatish/drik-panchanga) पर आधारित।
खगोलीय गणना के लिए Swiss Ephemeris का उपयोग करता है।