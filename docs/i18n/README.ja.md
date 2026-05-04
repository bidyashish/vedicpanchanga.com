# ヴェーダ・パンチャーンガ (Vedic Panchanga)

> [English](../../README.md) · [हिन्दी](README.hi.md) · [தமிழ்](README.ta.md) ·
> [বাংলা](README.bn.md) · [नेपाली](README.ne.md) · [中文](README.zh.md) · **日本語** ·
> [Español](README.es.md) · [Deutsch](README.de.md) · [Português](README.pt.md) ·
> [Français](README.fr.md) · [Русский](README.ru.md) · [العربية](README.ar.md) ·
> [فارسی](README.fa.md) · [עברית](README.he.md)

モダンな Web インターフェースを備えた Drik パンチャーンガ計算機。任意の日付 (紀元前 5000 年 〜 紀元後 5000 年) と任意の場所について、伝統的なヒンドゥー暦の要素・16 種類の分割図 (D1〜D60)・ヴィムショッタリー・ダシャー・アシュタカヴァルガ・吉祥なムフールタを計算します。

**サイト**: <https://vedicpanchanga.com>

⭐ このプロジェクトが役に立ったらリポジトリにスターをお願いします — 他の人がこのツールを見つけやすくなります。

---

## 技術スタック

| 層       | テクノロジー |
| -------- | ------------ |
| バックエンド | Python 3 · FastAPI · PySwissEph (スイス・エフェメリス) · `fpdf2` (PDF) · `127.0.0.1:8001` で `uvicorn` |
| フロントエンド | Vite · React 19 · TypeScript · Tailwind CSS v4 · ポート 3121 のクリーン URL SPA |
| インフラ  | Cloudflare → Nginx (TLS、静的ファイルホスト) → FastAPI ループバック · オプションで Prometheus + Grafana |

**データベースはありません**。すべての計算はステートレスで、バックエンドは何も永続化しません。

---

## ローカル実行

Python 3.10+ と Node.js 20+ が必要です。

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 1) バックエンド (ターミナル 1) — :8001 で FastAPI
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 2) フロントエンド (ターミナル 2) — :3121 で Vite 開発サーバー
cd frontend
cp .env.example .env              # VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

ブラウザで <http://localhost:3121> を開きます。Swagger ドキュメント: <http://localhost:8001/docs>。

---

## 機能

- **ジョーティシャ・クンダリー** — 16 分割図 (D1〜D60)、北インド/南インド様式
- **毎日の Drik パンチャーンガ** — Tithi · Nakṣatra · Yoga · Karaṇa · Vāra、日月の出入、Rāhu 時間、Abhijit など
- **ムフールタ・ファインダー** — 結婚・新居入居・事業・旅行など、最大 120 日まで吉時を走査
- **ヴィムショッタリー・マハーダシャー** — 出生から 120 年の完全サイクル (Antardaśā + Pratyantar 含む)
- **アシュタカヴァルガ** — 各惑星の Bhinnāṣṭakavarga と Sarvāṣṭakavarga 合計
- **ジャイミニ体系** — Chara karakas、Karakāṁśa および Swāṁśa チャート
- **PDF レポート** — 19 ページの印刷可能なバイリンガル (English / हिन्दी) レポート
- **複数の ayanāṁśa** — N.C. Lahiri (既定)、KP New/Old、B.V. Raman、KP Khullar、Sāyana、Manoj
- **バイリンガル UI** — English + हिन्दी、デーヴァナーガリー Web フォント対応

---

## API

すべてのエンドポイントは `/api` 配下にあります。本番では Nginx が同一オリジンでプロキシします。

| メソッド | パス                    | 用途                                                          |
|---------|-------------------------|---------------------------------------------------------------|
| POST    | `/api/calculate`        | 完全クンダリー (惑星、16 分割、daśā、aṣṭakavarga、karakas、kālasarpa) |
| GET     | `/api/get-panchang`     | 任意の日付 + 場所の Drik パンチャーンガ                       |
| GET     | `/api/ayanamsa-options` | 利用可能な ayanāṁśa 一覧                                      |
| GET     | `/api/muhurta-purposes` | ムフールタの目的カテゴリー                                    |
| POST    | `/api/find-muhurta`     | 期間内で吉祥な時間帯を走査                                    |
| POST    | `/api/print-pdf`        | フルの PDF レポートを生成 (en/hi)                             |

ディレクトリ別の詳細ドキュメント (英語):
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md) ·
[`infra/README.md`](../../infra/README.md) ·
[`backend/tests/README.md`](../../backend/tests/README.md)。
完全なデプロイ手順はルートの [`README.md`](../../README.md) を参照してください。

---

## ライセンス

**バックエンド**: AGPL-3.0 · **フロントエンド**: MIT

Satish BD の [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) をベースにしています。天文計算は [Swiss Ephemeris](https://www.astro.com/swisseph/) を使用。
