# Blue Ticket Driving（青切符ドライブ）

2026年4月施行の改正道路交通法（自転車の青切符制度）に対応し、5〜15歳の子どもが**すべての交差点で一時停止する習慣**を身につけるためのWebアプリです。目的地を設定すると自転車用ルートが計算され、GPS で走行を追跡し、各交差点で一時停止したかをリアルタイム判定します。

## 主な機能

- 目的地検索（Nominatim）または地図タップによるルート設定
- OSRM 自転車ルーティングによる経路探索
- 経路上の交差点（3差路以上）を自動検出
- Overpass API による公道フィルタリング（大学構内等の非公道を除外）
- GPS リアルタイム追跡と交差点での一時停止判定
- 経路逸脱時の自動リルート
- 走行結果の停止/未停止レポート
- オフライン対応（PWA + IndexedDB）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19, TypeScript, Vite 6, Tailwind CSS 3, Zustand 5, Dexie 4 (IndexedDB), React Leaflet 5, lucide-react, vite-plugin-pwa |
| バックエンド | FastAPI, OSRM (公開自転車ルーティング API), Overpass API (公道判定), httpx, Pydantic v2, pydantic-settings, geopy |
| ストレージ | IndexedDB（フロント側ローカルファースト） + インメモリ辞書（バックエンド側、DB 未接続） |

## 前提条件

- **Node.js** 18 以上（フロントエンド）
- **Python** 3.11 以上（バックエンド）
- **uv**（Python パッケージマネージャ）
- **Make**（同時起動用）

## セットアップ

### 1. バックエンド

```bash
cd backend
uv venv .venv
uv pip install -r requirements.txt
```

### 2. フロントエンド

```bash
cd frontend
npm install
```

## 起動方法

### 同時起動（推奨）

プロジェクトルートで以下を実行すると、**フロントエンドとバックエンドが同時に起動**します。

```bash
make dev
```

内部では以下の 2 プロセスがバックグラウンドで並行起動されます。

| プロセス | コマンド | ポート |
|---------|---------|--------|
| バックエンド | `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` | `http://localhost:8000` |
| フロントエンド | `vite` (HTTPS + basicSsl) | `https://localhost:5173` |

`Ctrl+C` で両プロセスが同時に終了します（`trap 'kill 0' EXIT` により）。

Vite の開発サーバが `/api/*` を `http://localhost:8000` にプロキシするため、フロントエンドからは `https://localhost:5173/api/...` でバックエンドにアクセスできます。

### 個別起動

バックエンドのみ:

```bash
make dev-backend
# または
cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

フロントエンドのみ:

```bash
make dev-frontend
# または
cd frontend && npm run dev
```

### モバイル端末からのアクセス

GPS 機能はブラウザの HTTPS が必須です。Vite の `@vitejs/plugin-basic-ssl` が自己署名証明書で HTTPS を提供するため、同一 LAN 内のモバイル端末から `https://<PCのIP>:5173` でアクセスできます（証明書の警告を許可する必要があります）。

## ビルド

```bash
cd frontend
npm run build    # tsc -b && vite build → dist/ に出力
```

## API エンドポイント

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/health` | ヘルスチェック |
| `POST` | `/api/trips` | トリップ作成 |
| `POST` | `/api/trips/{id}/route?origin_lat=&origin_lng=` | 経路探索 |
| `GET` | `/api/trips/{id}` | トリップ詳細 |
| `GET` | `/api/trips` | トリップ一覧 |
| `PATCH` | `/api/trips/{id}/end` | トリップ終了 |
| `GET` | `/api/trips/{id}/intersections` | 交差点判定サマリー |
| `POST` | `/api/gps` | GPS バッチ送信 |

## 設定

バックエンドの閾値は環境変数 `BTD_*` で変更可能（`backend/app/config.py`）。

| 環境変数 | デフォルト | 用途 |
|---------|----------|------|
| `BTD_INTERSECTION_RADIUS_M` | 15.0 | 交差点近接判定半径 (m) |
| `BTD_INTERSECTION_SPEED_THRESHOLD` | 3.0 | 一時停止とみなす速度 (km/h) |
| `BTD_INTERSECTION_MIN_ROADS` | 3 | 交差点とみなす最小接続道路数 |
| `BTD_OFF_ROUTE_THRESHOLD_M` | 50.0 | 経路逸脱判定閾値 (m) |
| `BTD_FILTER_NON_PUBLIC_ROADS` | True | 公道フィルタリングの有効/無効 |
| `BTD_OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM エンドポイント |
| `BTD_OVERPASS_API_URL` | `https://overpass-api.de/api/interpreter` | Overpass API エンドポイント |

## 制約事項

- ブラウザではバックグラウンド GPS 取得不可 — Wake Lock API で画面点灯を維持
- iOS Safariは非推奨: バックグラウンドで Service Worker が停止するため、Background Sync 不可
- GPS 取得には HTTPS が必須（localhost は例外）
- OSRM 公開 API はレートリミットあり — 本番環境ではセルフホスト推奨
- バックエンドはインメモリストレージのため、再起動でデータが消失
