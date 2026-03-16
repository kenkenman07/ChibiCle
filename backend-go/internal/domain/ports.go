package domain

import "context"

// TripRepository はトリップの永続化を抽象化するインターフェース．
// インメモリ実装や将来のDB実装を差し替え可能にする．
type TripRepository interface {
	Get(tripID string) (*Trip, error)    // ID指定でトリップを取得．存在しない場合は (nil, nil)
	Save(trip *Trip) error               // トリップを保存（作成・更新兼用）
	ListAll() ([]*Trip, error)           // 全トリップを開始日時の降順で取得
}

// GpsRepository はGPSポイントの永続化を抽象化するインターフェース．
type GpsRepository interface {
	GetPoints(tripID string) ([]GpsPoint, error)              // トリップに紐づく全GPSポイントを取得
	AppendPoints(tripID string, points []GpsPoint) error      // GPSポイントをバッチ追記
}

// RouteRepository はルートと交差点判定結果の永続化を抽象化するインターフェース．
type RouteRepository interface {
	SaveRoute(tripID string, route *Route) error                            // ルートを保存（上書き）
	GetRoute(tripID string) (*Route, error)                                 // ルートを取得．未設定時は (nil, nil)
	SaveIntersectionResults(tripID string, results []*IntersectionResult) error // 交差点結果を一括保存
	GetIntersectionResults(tripID string) ([]*IntersectionResult, error)        // 交差点結果を一括取得
}

// RoutingService は外部ルーティングAPIを抽象化するインターフェース．
// 実装は OsrmGateway が担う．
type RoutingService interface {
	GetBicycleRoute(ctx context.Context, origin, destination LatLng) (*Route, error)
}

// GeocodingService はジオコーディング（地名検索）APIを抽象化するインターフェース．
// 実装は PhotonGateway が担う．
type GeocodingService interface {
	Search(ctx context.Context, query string, limit int) ([]GeocodingResult, error)
}

// RoutePlanner はルート計画ユースケースを抽象化するインターフェース．
// ハンドラー層が usecase パッケージに直接依存しないために定義する．
type RoutePlanner interface {
	Plan(ctx context.Context, tripID string, origin, destination LatLng) (*Route, error)
}

// GpsAnalyzer はGPS分析ユースケースを抽象化するインターフェース．
// GPSバッチ受信→一時停止判定→リルートの一連の処理を実行する．
type GpsAnalyzer interface {
	Execute(ctx context.Context, tripID string, points []GpsPoint) (*GpsAnalysisResult, error)
}
