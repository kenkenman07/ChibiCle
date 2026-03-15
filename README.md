# Blue Ticket Driving — Go バックエンドサーバー仕様書 (プロダクト全体のREADMEではない！)

## 1. 概要

バックエンドは，自転車走行中に全交差点での一時停止を促すPWA「青切符ドライブ」のサーバーサイドを担う．
フロントエンド（React + TypeScript）からのAPIリクエストを受け付け，ルーティング・GPS分析・ジオコーディングの3つの機能を提供する．

### 技術スタック

| 要素 | 技術 |
|---|---|
| 言語 | Go 1.22 |
| HTTPフレームワーク | go-chi/chi v5 |
| アーキテクチャ | Clean Architecture（domain → usecase → adapter → cmd） |
| ストレージ | インメモリ（sync.RWMutex による並行安全） |
| 外部API | OSRM（ルーティング），Overpass（公道判定・信号フィルタ），Photon（ジオコーディング） |
| 設定管理 | kelseyhightower/envconfig（環境変数，プレフィックス `BTD_`） |

---

## 2. アーキテクチャ

### 2.1 レイヤー構成

- `cmd/server/main.go` — エントリーポイント（DI合成ルート）
- `config/config.go` — 環境変数からの設定読み込み
- `domain/` — ビジネスルールの中核（外部依存なし）
  - `models.go` — データ型: Trip, GpsPoint, Route, Intersection 等
  - `ports.go` — インターフェース定義のみ
  - `errors.go` — ドメインエラー型
  - `geo.go` — Haversine距離計算（純粋関数）
- `usecase/` — ビジネスロジック（domain のみに依存）
  - `route_planning.go` — ルート計画ユースケース
  - `gps_analysis.go` — GPS分析ユースケース
- `adapter/` — 外部世界との接続（domain のみに依存）
  - `memory_repo.go` — インメモリリポジトリ
  - `osrm_gateway.go` — OSRM + Overpass クライアント
  - `photon_gateway.go` — Photon ジオコーディングクライアント
  - `httpclient.go` — User-Agent付与のHTTPラッパー
  - `handler/` — HTTPハンドラー
    - `trips.go` — トリップ関連エンドポイント
    - `gps.go` — GPSバッチ受信エンドポイント
    - `geocode.go` — 地名検索エンドポイント
    - `middleware.go` — リクエストログミドルウェア
    - `response.go` — JSON読み書きユーティリティ

### 2.2 依存関係の方向

全ての依存は内向き（外側 → 内側）のみ．handler/usecase/adapter は `domain` パッケージのみを import する．

- **handler/** は **domain/** のみに依存する（ports.go のインターフェースのみ）
- **usecase/** は **domain/** のみに依存する（ports.go + models.go + geo.go）
- **adapter/** は **domain/** のみに依存する（ports.go + models.go）
- **cmd/** は全層に依存する（唯一の具体型を知る場所）

### 2.3 インターフェース一覧

| インターフェース | 定義場所 | 実装 | 用途 |
|---|---|---|---|
| `TripRepository` | domain/ports.go | InMemoryRepository | トリップの CRUD |
| `GpsRepository` | domain/ports.go | InMemoryRepository | GPSポイントの追記・取得 |
| `RouteRepository` | domain/ports.go | InMemoryRepository | ルート・交差点結果の読み書き |
| `RoutingService` | domain/ports.go | OsrmGateway | 外部ルーティングAPI |
| `GeocodingService` | domain/ports.go | PhotonGateway | 外部ジオコーディングAPI |
| `RoutePlanner` | domain/ports.go | RoutePlanningUseCase | ルート計画ユースケース |
| `GpsAnalyzer` | domain/ports.go | GpsAnalysisUseCase | GPS分析ユースケース |

---

## 3. APIエンドポイント

### 3.1 一覧

| メソッド | パス | 機能 | 使用フェーズ |
|---|---|---|---|
| `POST` | `/api/trips` | トリップ作成 | 目的地設定時 |
| `GET` | `/api/trips` | トリップ一覧取得 | 履歴画面（未使用: ローカルDB参照） |
| `GET` | `/api/trips/{tripID}` | トリップ詳細取得 | リルート後のルート再取得 |
| `POST` | `/api/trips/{tripID}/route` | ルート計画 | 目的地設定時 |
| `PATCH` | `/api/trips/{tripID}/end` | トリップ終了 | 走行終了時 |
| `GET` | `/api/trips/{tripID}/intersections` | 交差点結果サマリー | 結果画面（未使用: ローカルDB参照） |
| `POST` | `/api/gps` | GPSバッチ受信 | 走行中（5秒間隔） |
| `GET` | `/api/geocode?q=&limit=` | 地名検索 | 出発地・目的地検索 |
| `GET` | `/health` | ヘルスチェック | インフラ監視 |

### 3.2 エラーレスポンス形式

全エンドポイント共通．FastAPI互換の形式を採用する．

```json
{
  "detail": "エラーメッセージ"
}
```

---

## 4. フロントエンドからの利用フロー

### 4.1 全体のシーケンス

フロントエンドの走行フローは4つのフェーズで構成される．各フェーズでバックエンドAPIがどのように呼ばれるかを以下に示す．

**Phase 1: 出発地選択**
ユーザーが地図タップまたは検索で出発地を決定する．
API: `GET /api/geocode?q=...`（検索使用時のみ）

**Phase 2: 目的地選択 + ルート計画**
ユーザーが目的地を設定し「ルートを取得」ボタンを押す．
API: `GET /api/geocode?q=...`（検索使用時のみ）
API: `POST /api/trips` — トリップ作成（目的地付き）
API: `POST /api/trips/{id}/route` — ルート計画（出発地送信）

**Phase 3: 保護者確認**
ルート情報を表示し保護者と確認する．
API: なし（ローカルデータのみ使用）

**Phase 4: 走行中**
GPS watchPosition で測位し，IndexedDB にバッファし，5秒ごとにバッチ送信する．
API: `POST /api/gps` — 5秒間隔で繰り返し
API: `GET /api/trips/{id}` — リルート発生時のみ
API: `PATCH /api/trips/{id}/end` — 走行終了時

### 4.2 Phase 2: トリップ作成とルート計画（詳細）

フロントエンドは2つのAPIを順番に呼び出す．

#### Step 1: トリップ作成

フロントエンドが `POST /api/trips` を送信する．

リクエスト:
```json
{
  "destination_lat": 35.710,
  "destination_lng": 139.811
}
```

バックエンドの処理: UUID v4 を採番し，started_at に現在時刻を記録し，リポジトリに保存する．

レスポンス（201 Created）:
```json
{
  "id": "a1b2c3d4-...",
  "started_at": "2026-03-15T10:00:00Z",
  "ended_at": null,
  "distance_m": 0,
  "destination_lat": 35.710,
  "destination_lng": 139.811,
  "route": null
}
```

`route` はこの時点では null（次の Step でルート計画を実行する）．

フロントエンドは返却された `id` を以降の全APIリクエストで使用する．
同時に IndexedDB（Dexie）にもトリップを保存する（ローカルファースト）．

#### Step 2: ルート計画

フロントエンドが `POST /api/trips/{id}/route` を送信する．

リクエスト:
```json
{
  "origin_lat": 35.681,
  "origin_lng": 139.767
}
```

バックエンドの処理:
1. OSRM Bicycle Route API を呼び出し
2. GeoJSON [lng, lat] を内部形式 [lat, lng] に変換
3. bearings >= 3 の交差点を抽出
4. Overpass API で公道フィルタ + 信号付き交差点の除外（1回のクエリで統合処理）
5. Route + IntersectionResult[] をリポジトリに保存

レスポンス（200 OK）:
```json
{
  "id": "a1b2c3d4-...",
  "route": {
    "geometry": [[35.681, 139.767], ...],
    "intersections": [
      {
        "index": 0,
        "lat": 35.685,
        "lng": 139.770,
        "num_roads": 3,
        "stopped": false,
        "min_speed_kmh": null
      }
    ],
    "distance_m": 2345.6,
    "duration_s": 480.0
  }
}
```

`geometry` は経路線の座標列．`intersections` の `stopped` は初期値として全て false で返る．

フロントエンドは `route` を以下の3箇所に保存する:
1. **Jotai atom** — UI即時反映（地図上のルート線・交差点マーカー）
2. **IndexedDB `routes` テーブル** — オフライン耐性
3. **IndexedDB `intersectionResults` テーブル** — 各交差点の判定結果を個別管理

### 4.3 Phase 4: GPS バッチ送信（詳細）

走行中のGPSデータは以下のパイプラインで処理される．

1. **GPS watchPosition**（ブラウザAPI）が約1秒ごとに測位を発火する
2. 各測位データは2つの経路に同時に流れる:
   - **atom 更新**: 速度・精度・現在地をUIに即時反映する
   - **IndexedDB 追記**: `synced: false` としてバッファする
3. **setInterval**（5秒間隔）が Dexie から `synced=false` を全件取得し，`POST /api/gps` にバッチ送信する

#### リクエスト

```json
{
  "trip_id": "a1b2c3d4-...",
  "points": [
    {
      "lat": 35.6815,
      "lng": 139.7672,
      "speed_kmh": 12.3,
      "accuracy_m": 8.5,
      "recorded_at": "2026-03-15T10:00:05Z"
    },
    {
      "lat": 35.6820,
      "lng": 139.7678,
      "speed_kmh": 2.1,
      "accuracy_m": 6.2,
      "recorded_at": "2026-03-15T10:00:06Z"
    }
  ]
}
```

#### バックエンド処理

`GpsAnalysisUseCase.Execute()` が以下の順で処理する:

1. GPSポイントをリポジトリに追記する
2. **経路逸脱チェック**: 最新GPSポイントがルートジオメトリの全頂点から50m超離れている場合，OSRMで現在地から目的地への新ルートを取得する
3. **交差点一時停止判定**: 各GPSポイント（精度 <= 20m のみ）について，各交差点（未停止のもの）との Haversine 距離が15m以内かを判定する．圏内かつ速度が3.0 km/h未満なら `stopped = true` とする
4. 判定結果をリポジトリに保存する

#### レスポンス: 通常時

```json
{
  "saved": 5,
  "intersection_updates": [
    {
      "index": 2,
      "stopped": true,
      "min_speed_kmh": 1.2
    }
  ],
  "rerouted": false
}
```

フロントエンドは `intersection_updates` を IndexedDB に差分適用し，atom の停止カウントを更新する．

#### レスポンス: リルート発生時

```json
{
  "saved": 3,
  "intersection_updates": [],
  "rerouted": true
}
```

`rerouted: true` の場合，フロントエンドは追加で `GET /api/trips/{id}` を呼び出してルート全体を再取得する．バックエンドはトリップ + 新ルート + 新交差点リストを含むレスポンスを返す．

フロントエンドは:
1. atom の `route` を差し替え
2. IndexedDB の `routes` を上書き
3. IndexedDB の `intersectionResults` を全削除 → 新交差点で再作成

### 4.4 Phase 4 終了: トリップ終了

フロントエンドは以下の順序で終了処理を行う:

1. GPS watchPosition を停止する
2. 未同期GPSの最終フラッシュ（`POST /api/gps`）を実行する
3. Wake Lock を解放する
4. `PATCH /api/trips/{id}/end` を送信する

リクエスト:
```json
{
  "distance_m": 2345
}
```

バックエンドの処理: `ended_at` に現在時刻を記録し，`distance_m` を保存する．

レスポンス（200 OK）にはトリップ全体が返る（`ended_at` が設定済み）．

フロントエンドはレスポンス受信後，`/result/{id}` に画面遷移する．

### 4.5 地名検索

出発地・目的地の選択時に使用する．

フロントエンドはユーザーのテキスト入力に対して1秒のデバウンスを適用し，`GET /api/geocode?q=東京駅&limit=5` を送信する．

バックエンドの処理: Photon API に転送し（レートリミッター: 1秒間隔），GeoJSON レスポンスを `{lat, lng, display_name}` に変換する．

レスポンス（200 OK）:
```json
[
  {"lat": 35.6812, "lng": 139.7671, "display_name": "東京駅, 千代田区, 東京都"}
]
```

エラー時（Photon API不達等）は空配列 `[]` を返す．ユーザーには検索結果なしとして表示される．

---

## 5. データモデル

### 5.1 バックエンド（domain/models.go）

| 型 | 用途 | 主要フィールド |
|---|---|---|
| `Trip` | 1回の走行 | ID, StartedAt, EndedAt*, DistanceM, DestinationLat*, DestinationLng* |
| `GpsPoint` | 1件のGPS測位 | Lat, Lng, SpeedKmh, AccuracyM, RecordedAt |
| `Route` | OSRM経路 | Geometry[]LatLng, Intersections[], DistanceM, DurationS |
| `Intersection` | 経路上の交差点 | Index, Lat, Lng, NumRoads |
| `IntersectionResult` | 交差点の判定結果 | Intersection, Stopped, MinSpeedKmh* |
| `GpsAnalysisResult` | GPS分析の返却値 | Saved, IntersectionResults[], Rerouted |
| `GeocodingResult` | 地名検索結果 | Lat, Lng, DisplayName |

### 5.2 フロントエンド（IndexedDB via Dexie）

| テーブル | 主キー | バックエンド対応 | 用途 |
|---|---|---|---|
| `trips` | id (string) | Trip | トリップのローカルコピー |
| `gpsPoints` | id (auto) | GpsPoint | GPSバッファ（synced フラグ付き） |
| `intersectionResults` | id (auto) | IntersectionResult | 交差点判定の差分適用先 |
| `routes` | tripId (string) | Route | ルートのローカルコピー |

### 5.3 フロントエンド（Jotai atom）

リアルタイムUI用の揮発性状態．IndexedDB とは別に管理する．

| atom | 型 | 更新タイミング |
|---|---|---|
| `isRiding` | boolean | startRide / endRide |
| `tripId` | string \| null | POST /api/trips 成功時 |
| `currentSpeed` | number | watchPosition のたび |
| `currentAccuracy` | number | watchPosition のたび |
| `currentLat/Lng` | number \| null | watchPosition のたび |
| `route.state` | RouteData \| null | POST /api/trips/{id}/route 成功時，リルート時，stopped=true 反映時 |
| `score.state` | number | 安全に通れた交差点の累計数 |
| `coordinateNotSafety` | LatLng[] | stopped=false で min_speed_kmh が記録された交差点座標 |
| `priorStoppedCount` | number | リルート発生時に prior_stopped_count を保存（累計停止数の引き継ぎ） |

---

## 6. バックエンドの判定アルゴリズム

### 6.1 交差点抽出（ルート計画時）

```
OSRM レスポンスの steps[].intersections[] から:
  1. bearings の要素数 >= 3 のノードを交差点として採用（T字路以上）
  2. 座標を小数点6桁で丸め，重複を排除
  3. annotation.nodes から OSM ノードID を取得
  4. Overpass API で以下の2つのフィルタを1回の統合クエリで実行:
     a. 公道フィルタ — highway タグを照合し，公道上のノードのみ残す
        対象タグ: trunk, primary, secondary, tertiary, unclassified,
                 residential, living_street（各 _link を含む）
     b. 信号フィルタ — highway="traffic_signals" タグを持つノードを除外する
        （信号のある交差点は安全性が高いため判定対象外とする）
  5. ノードID が不明な交差点は安全側に残す（公道とみなす）
```

### 6.2 一時停止判定（GPSバッチ受信時）

```
入力: GPSポイント列 + 全交差点の現在の判定結果
パラメータ:
  - intersection_radius_m = 15.0   （交差点圏内の半径）
  - intersection_speed_threshold = 3.0  （一時停止と判定する速度 km/h）
  - gps_accuracy_threshold_m = 20.0  （この精度を超えるポイントは無視）

アルゴリズム:
  for each GPSポイント:
    if accuracy > 20m → スキップ
    for each 交差点（stopped=false のもののみ）:
      distance = Haversine(GPS座標, 交差点座標)
      if distance <= 15m:
        min_speed_kmh を更新（より小さい値で上書き）
        if speed < 3.0 km/h:
          stopped = true（以降この交差点は判定対象外）
```

### 6.3 経路逸脱判定（GPSバッチ受信時）

```
入力: 最新GPSポイント + ルートジオメトリの全頂点
パラメータ:
  - off_route_threshold_m = 50.0

アルゴリズム:
  for each ルート頂点:
    distance = Haversine(GPS座標, 頂点座標)
    if distance <= 50m → 経路上にいると判定（早期リターン）
  全頂点を走査しても 50m 以内のものがなければ → 逸脱と判定

逸脱時の処理:
  1. 現在位置 → 目的地で OSRM に新ルートを問い合わせ
  2. 新しい交差点リストを Stopped=false で初期化
  3. ルート・交差点結果をリポジトリに上書き保存
  4. レスポンスで rerouted=true を返却
```

---

## 7. 外部API連携

### 7.1 OSRM（Open Source Routing Machine）

| 項目 | 値 |
|---|---|
| エンドポイント | `{BTD_OSRM_BASE_URL}/route/v1/bicycle/{lng1},{lat1};{lng2},{lat2}` |
| パラメータ | `steps=true&geometries=geojson&overview=full&annotations=nodes` |
| 認証 | 不要（公開API） |
| レートリミット | 公開サーバーは制限あり（本番ではセルフホスト推奨） |
| 使用箇所 | ルート計画，リルート |
| User-Agent | `BlueTicketDriving/1.0 (bicycle-safety-pwa)` |

### 7.2 Overpass API

| 項目 | 値 |
|---|---|
| エンドポイント | `{BTD_OVERPASS_API_URL}` (POST) |
| クエリ言語 | Overpass QL |
| クエリ内容 | 1回の統合クエリで2種のフィルタを実行（下記参照） |
| リトライ | 429 レートリミット時に指数バックオフ（1s, 2s, 4s，最大3回） |
| キャッシュ | ノードID→（公道判定 + 信号判定）を最大50,000件FIFOキャッシュ |
| 使用箇所 | ルート計画時の公道フィルタ + 信号フィルタ |

**Overpass QL クエリ:**
```
[out:json][timeout:10];
node(id:{nodeIDs})->.isec;
way(bn.isec)["highway"~"^(trunk|trunk_link|...|living_street)$"];
out skel qt;
node.isec["highway"="traffic_signals"];
out ids qt;
```

1行目〜2行目: 対象ノードIDを変数 `.isec` に格納
3行目: `.isec` のノードを含む公道 way を取得 → `type: "way"` として返る
4行目: `.isec` のうち信号タグを持つノードを取得 → `type: "node"` として返る

パース時に `type` で分岐し，`PublicNodes`（公道上のノード集合）と `SignalNodes`（信号付きノード集合）を構築する．最終的に **公道上 かつ 信号なし** の交差点のみを残す．

### 7.3 Photon（ジオコーディング）

| 項目 | 値 |
|---|---|
| エンドポイント | `{BTD_PHOTON_BASE_URL}/api/` (GET) |
| パラメータ | `q={検索語}&lang=ja&limit={件数}&lat=35.6812&lon=139.7671` |
| レートリミッター | サーバー側で1秒間隔に制御 |
| バイアス | 東京中心（lat/lon パラメータ） |
| エラー時の挙動 | 空配列を返す（ユーザーには「結果なし」として表示） |

---

## 8. 設定一覧

全設定は環境変数で注入可能（プレフィックス `BTD_`）．
`PORT` のみ Railway 等の PaaS 互換のためプレフィックスなしも受け付ける．

| 環境変数 | デフォルト | 説明 |
|---|---|---|
| `BTD_PORT` or `PORT` | 8000 | リッスンポート |
| `BTD_CORS_ORIGINS` | localhost:5173 等 | CORS許可オリジン |
| `BTD_CORS_ALLOW_ALL` | true | true で全オリジン許可 |
| `BTD_OSRM_BASE_URL` | https://router.project-osrm.org | OSRM API |
| `BTD_INTERSECTION_RADIUS_M` | 15.0 | 交差点判定半径（m） |
| `BTD_INTERSECTION_SPEED_THRESHOLD` | 3.0 | 一時停止判定速度（km/h） |
| `BTD_INTERSECTION_MIN_ROADS` | 3 | 交差点の最小道路数 |
| `BTD_GPS_ACCURACY_THRESHOLD_M` | 20.0 | GPS精度フィルタ（m） |
| `BTD_OFF_ROUTE_THRESHOLD_M` | 50.0 | 経路逸脱判定距離（m） |
| `BTD_FILTER_NON_PUBLIC_ROADS` | true | 公道フィルタ + 信号フィルタ有効化 |
| `BTD_OVERPASS_API_URL` | https://overpass-api.de/api/interpreter | Overpass API |
| `BTD_PHOTON_BASE_URL` | https://photon.komoot.io | Photon API |

---

## 9. サーバー運用機能

| 機能 | 実装 |
|---|---|
| ヘルスチェック | `GET /health` → `{"status":"ok"}` |
| Graceful Shutdown | SIGINT/SIGTERM → 5秒タイムアウトで srv.Shutdown() |
| 構造化ログ | log/slog による JSON 形式ログ |
| リクエストログ | 全リクエストの method/path/status/duration を記録 |
| コネクションプール | http.Transport: MaxIdleConns=100, MaxIdleConnsPerHost=20 |
| User-Agent 付与 | 全外部APIリクエストに自動付与（RoundTripperWithUA） |
| CORS | go-chi/cors: 全オリジン許可（開発時）またはホワイトリスト（本番） |

---

## 10. フロントエンドとの責務分担

| 責務 | フロントエンド | バックエンド |
|---|---|---|
| GPS取得 | watchPosition で測位 | — |
| 速度計算 | navigator.speed + Haversine フォールバック | — |
| 距離累積 | Haversine で逐次加算 | — |
| GPSバッファリング | IndexedDB に追記（synced=false） | — |
| GPS送信 | 5秒ごとに未同期分をバッチ POST | — |
| ルート取得 | — | OSRM API 呼び出し + 交差点抽出 |
| 公道・信号フィルタ | — | Overpass API 統合クエリ + ノードキャッシュ |
| 一時停止判定 | — | 距離計算 + 速度閾値判定 |
| 経路逸脱判定 | — | Haversine + 閾値比較 |
| リルート | 検知後にルート再取得 | OSRM で新ルート計算 |
| 交差点結果反映 | intersection_updates を Dexie に差分適用 | — |
| 地名検索 | 入力UI + 1秒デバウンス | Photon API 転送 + レートリミッター |
| 結果表示 | IndexedDB から読み出し（バックエンド不要） | — |
| 履歴表示 | IndexedDB から読み出し（バックエンド不要） | — |
| Wake Lock | Screen Wake Lock API | — |
| オフライン耐性 | IndexedDB に全データ保持 | — |

---

## 11. 通信プロトコルの特性

現在は全てHTTP/JSON（RESTful）で通信する．WebSocket は使用していない．

| 特性 | 現在の実装 |
|---|---|
| プロトコル | HTTP/1.1（Vite プロキシ経由） |
| GPS同期方式 | 5秒間隔の setInterval + POST /api/gps |
| 最大レイテンシ | 5秒（ポーリング間隔） |
| オフライン時 | IndexedDB にバッファし，次回同期間隔でリトライ |
| リルート通知 | サーバーからの Push 不可．レスポンスの rerouted フラグで検知 |
| 結果画面のデータ | バックエンド不要（IndexedDB のみ参照） |
