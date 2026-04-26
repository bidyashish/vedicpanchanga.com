# 吠陀历法 (Vedic Panchanga)

> [English](../../README.md) · [हिन्दी](../../README.hi.md) · [தமிழ்](../../README.ta.md) ·
> **中文** · [日本語](README.ja.md) · [Español](README.es.md) ·
> [Deutsch](README.de.md) · [Português](README.pt.md) · [Français](README.fr.md)

带有现代 Web 界面的 Drik 历法 (Panchanga) 计算器。可计算任意日期 (公元前 5000 – 公元 5000) 任意地点的传统印度教 Panchanga 元素、十六分盘 (D1–D60)、Vimshottari Daśā、Aṣṭakavarga,以及吉祥的 Muhūrta 时段。

**网站**: <https://vedicpanchanga.com>

⭐ 如果本项目对你有帮助,请给仓库一颗星 — 这能帮助更多人发现它。

---

## 技术栈

| 层级    | 技术 |
| ------- | ---- |
| 后端    | Python 3 · FastAPI · PySwissEph (瑞士星历表) · `fpdf2` (PDF) · `uvicorn` 监听 `127.0.0.1:8001` |
| 前端    | Vite · React 19 · TypeScript · Tailwind CSS v4 · 端口 3121 上的纯净 URL SPA |
| 基础设施 | Cloudflare → Nginx (TLS、静态文件托管) → FastAPI 回环 · 可选 Prometheus + Grafana |

**没有数据库**。所有计算都是无状态的,后端不持久化任何东西。

---

## 本地运行

需要 Python 3.10+ 和 Node.js 20+。

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) 后端 (终端 1) — FastAPI 监听 :8001
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) 前端 (终端 2) — Vite 开发服务器 :3121
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

打开 <http://localhost:3121>。Swagger 文档: <http://localhost:8001/docs>。

---

## 功能特性

- **占星命盘 (Jyotiṣa Kuṇḍalī)** — 16 个分盘 (D1–D60),北印度或南印度风格
- **每日 Drik Pañcāṅga** — 太阴日 · 星宿 · Yoga · Karaṇa · 星期,日月升落,Rāhu 时段,Abhijit 等
- **Muhūrta 查找器** — 为婚姻、乔迁、商业、出行等扫描最长 120 天的吉时
- **Vimshottari Mahādaśā** — 出生起 120 年完整周期 (含 Antardaśā + Pratyantar)
- **Aṣṭakavarga** — 每行星的 Bhinnāṣṭakavarga + Sarvāṣṭakavarga 总分
- **Jaimini 体系** — Chara karakas、Karakāṁśa 与 Swāṁśa 盘
- **PDF 报告** — 19 页可打印的双语 (English / हिन्दी) 报告
- **多种 ayanāṁśa** — N.C. Lahiri (默认)、KP 新/旧、B.V. Raman、KP Khullar、Sāyana、Manoj
- **双语界面** — English + हिन्दी,带天城文 Web 字体

---

## API

所有端点都挂在 `/api` 之下。生产环境中 Nginx 在同源代理它们。

| 方法 | 路径                    | 用途                                                            |
|------|-------------------------|-----------------------------------------------------------------|
| POST | `/api/calculate`        | 完整命盘 (行星、16 分盘、daśā、aṣṭakavarga、karakas、kālasarpa) |
| GET  | `/api/get-panchang`     | 任意日期 + 地点的 Drik Pañcāṅga                                 |
| GET  | `/api/ayanamsa-options` | 列出可用的 ayanāṁśa 系统                                        |
| GET  | `/api/muhurta-purposes` | Muhūrta 用途分类                                                |
| POST | `/api/find-muhurta`     | 在某日期范围内扫描吉时                                          |
| POST | `/api/print-pdf`        | 渲染完整的 PDF 报告 (en/hi)                                     |

按目录分组的详细英文文档:
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md)。
完整部署指南请参阅根目录的 [`README.md`](../../README.md)。

---

## 许可证

**后端**: AGPL-3.0 · **前端**: MIT

基于 Satish BD 的 [Drik Panchanga](https://github.com/bdsatish/drik-panchanga)。天文计算由 [Swiss Ephemeris](https://www.astro.com/swisseph/) 提供。
