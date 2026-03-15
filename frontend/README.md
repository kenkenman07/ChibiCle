# データの流れ 必要な機能

## Zustand ストア → atom(jotai) に変更

## バックエンドの処理を完全に API を見立てたときのフロントエンドの処理

## ルート検索

- ルート検索ページを開く

  - 現在地の座標取得
    - navigator.geolocation.watchPosition()
  - マップに現在地を表示
    - Leaflet.js (react-leaflet)

- 目的地を入力し検索ボタン押す

  - 目的地の座標取得
    - /api/geocode?q=&limit=
  - マップに目的地を表示

- 「ルート検索をする」に対して「はい」を選択

  - トリップを作成する

    - POST /api/trips  
      `{"destination_lat": 35.710,"destination_lng": 139.811}`
    - 返ってきた id を取得

  - ルートを取得

    - POST /api/trips/{id}/route  
      `{"origin_lat": 35.681,"origin_lng": 139.767}`

    - レスポンス  
      `geomotry`

    - route を取得 以下に保存
      1. グローバルステート(atom)
      2. IndexedDB routes テーブル
      3. IndexedDB intersectionResults テーブル

  - route.geometry からルートを表示

## 走行中

- Wake Lock 開始メソッドを呼び出す

- 1 秒ごとに現在地情報を取得 (速度・精度・現在地)

  - 現在地情報をグローバルステート(atom)と IndexedDB(gps Point テーブル)に保存
  - atom からデータを取得 & マップに表示
  - gps Point テーブル には`synced: false`を追記して保存する
    - `synced: false`はまだサーバへ送信されてないことを表す

- 5 秒ごとに IndexedDB(gps Point テーブル)の`synced: false`である現在地情報をサーバへ送る

  - POST /api/gps
  - レスポンス  
     `{
  "saved": 5,
  "intersection_updates": [
    {
      "index": 2,
      "stopped": true,
      "min_speed_kmh": 1.2
    }
  ],
  "rerouted": false
}`
  - stopped
    - true ： グローバルステート(atom)の停止カウントをアップ
      - route.state に登録
    - false 座標を保持
      - coordinateNotSafety に登録
  - IndexedDB intersectionResults テーブルにレスポンスを上書き

- リルート(ルートの再検索)

  - レスポンス`"intersection_updates"`中の`"rerouted": true`である場合

  - ルート再取得

    - GET /api/trips/{id}

  - ルートを取得 データを以下のように処理

    1. グローバルステート(atom)を上書き
    2. IndexedDB routes テーブル を上書き
    3. IndexedDB intersectionResults テーブル 全削除

## 走行終了

- 走行終了ボタンを押す

  - GPS watchPosition を停止メソッドを呼び出す
  - 最後のバッチ送信を行う

    - POST /api/gps

  - Wake Lock 終了メソッドを呼び出す

  - PATCH /api/trips/{id}/end を送信する  
    `{"distance_m": 2345}`

  - レスポンス受信後，/result/{id} へ遷移

## 必要な機能

### GPS 関連

- 現在地情報取得メソッド (一回用)
- 現在地情報取得メソッド (継続的用)
- GPS 取得停止メソッド

### Wake Lock

- スタート
- ストップ

### データ登録関連

#### atom

- route.state
  - getter と setter
- score.state
  - 安全に通れた回数
  - getter と setter
- coordinateNotSafety
  - 安全に通れなかった座標

#### indexedDB

- route テーブル
  - 登録と取得
- intersectionResults テーブル
  - 登録と取得と削除
- gps Point テーブル
  - 登録と取得

### API クライアント

- createTrips()

  - POST /api/trips

- fetchRoute()

  - POST /api/trips/{id}/route

- sendCurrentLocation()

  - POST /api/gps

- reRoute()

  - GET /api/trips/{id}

- finishTrip()
  - PATCH /api/trips/{id}/end
