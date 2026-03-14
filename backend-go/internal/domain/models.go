// domain パッケージはビジネスルールの中核となるデータ構造を定義する．
// 外部ライブラリへの依存を持たず，アプリケーション全体の共通語彙として機能する．
package domain

// GpsPoint はフロントエンドから送信される1件のGPS測位データを表す．
// 走行中に5秒間隔でバッチ送信される．
type GpsPoint struct {
	Lat        float64 // 緯度
	Lng        float64 // 経度
	SpeedKmh   float64 // 測位時の速度（km/h）
	AccuracyM  float64 // 測位精度（メートル）．値が大きいほど不正確
	RecordedAt string  // 測位日時（RFC3339）
}

// Trip は目的地までの1回の走行を表す．
// フロントエンドで走行開始時に作成され，終了時に EndedAt が記録される．
type Trip struct {
	ID             string   // UUID v4
	StartedAt      string   // 走行開始日時（RFC3339）
	EndedAt        *string  // 走行終了日時．走行中は nil
	DistanceM      float64  // 総走行距離（メートル）．終了時にフロントエンドから送信
	DestinationLat *float64 // 目的地の緯度．未設定時は nil
	DestinationLng *float64 // 目的地の経度．未設定時は nil
}

// Intersection は経路上の1つの交差点を表す．
// OSRM レスポンスから bearings 数が閾値以上のノードとして抽出される．
type Intersection struct {
	Index    int     // 経路上での連番（0始まり）
	Lat      float64 // 緯度
	Lng      float64 // 経度
	NumRoads int     // 合流する道路数（bearings の数）
}

// IntersectionResult は各交差点での一時停止判定の結果を保持する．
// GPS 受信のたびに更新され，一度 Stopped=true になると変化しない．
type IntersectionResult struct {
	Intersection Intersection // 対応する交差点
	Stopped      bool         // 一時停止したか
	MinSpeedKmh  *float64     // 交差点圏内で記録された最小速度．未通過時は nil
}

// Route はOSRMから取得した自転車ルートを表す．
// ジオメトリ（経路線）と経路上の交差点リストを含む．
type Route struct {
	Geometry      []LatLng       // 経路線の座標列（[lat, lng] の順）
	Intersections []Intersection // 経路上の交差点リスト
	DistanceM     float64        // 経路の総距離（メートル）
	DurationS     float64        // 経路の推定所要時間（秒）
}

// LatLng は緯度・経度のペアを表す汎用型．
type LatLng struct {
	Lat float64
	Lng float64
}

// GpsAnalysisResult はGPSバッチ処理の結果を表す．
// 保存件数，交差点判定結果，リルート有無をまとめて返却する．
type GpsAnalysisResult struct {
	Saved               int                    // 保存されたGPSポイント数
	IntersectionResults []*IntersectionResult   // 全交差点の最新判定結果
	Rerouted            bool                   // 経路逸脱によりリルートが発生したか
}

// GeocodingResult はジオコーディング検索の1件の結果を表す．
type GeocodingResult struct {
	Lat         float64 // 緯度
	Lng         float64 // 経度
	DisplayName string  // 表示用の地名（例: "東京駅, 千代田区, 東京都"）
}
