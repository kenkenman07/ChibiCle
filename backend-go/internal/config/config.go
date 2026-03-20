// config パッケージは環境変数からアプリケーション設定を読み込む．
// 全設定はプレフィックス BTD_ 付きの環境変数で上書き可能．
package config

import (
	"os"
	"strconv"

	"github.com/kelseyhightower/envconfig"
)

// Settings はアプリケーション全体の設定値を保持する．
type Settings struct {
	// CORS 設定
	CorsOrigins  []string `envconfig:"CORS_ORIGINS" default:"https://localhost:5173,https://127.0.0.1:5173,https://localhost:4173,http://localhost:5173,http://localhost:8000"`
	CorsAllowAll bool     `envconfig:"CORS_ALLOW_ALL" default:"true"` // true の場合，全オリジンを許可

	// OSRM ルーティング設定
	OsrmBaseURL string `envconfig:"OSRM_BASE_URL" default:"https://router.project-osrm.org"`
	OsrmProfile string `envconfig:"OSRM_PROFILE" default:"bike"`

	// 交差点判定パラメータ
	IntersectionRadiusM        float64 `envconfig:"INTERSECTION_RADIUS_M" default:"15.0"`       // 交差点圏内と判定する半径（m）
	IntersectionSpeedThreshold float64 `envconfig:"INTERSECTION_SPEED_THRESHOLD" default:"5.0"` // 一時停止と判定する速度閾値（km/h）
	IntersectionMinRoads       int     `envconfig:"INTERSECTION_MIN_ROADS" default:"3"`         // 交差点とみなす最小道路数（T字路=3）

	// GPS 処理パラメータ
	GpsAccuracyThresholdM float64 `envconfig:"GPS_ACCURACY_THRESHOLD_M" default:"50.0"` // この精度を超えるGPSポイントは無視
	OffRouteThresholdM    float64 `envconfig:"OFF_ROUTE_THRESHOLD_M" default:"10.0"`    // 経路から離れるとリルートする距離（m）

	// Overpass API（交差点フィルタ用）
	FilterNonPublicRoads          bool   `envconfig:"FILTER_NON_PUBLIC_ROADS" default:"true"`         // 公道以外の交差点を除外するか
	FilterSignalizedIntersections bool   `envconfig:"FILTER_SIGNALIZED_INTERSECTIONS" default:"true"` // 信号付き交差点を除外するか
	OverpassAPIURL                string `envconfig:"OVERPASS_API_URL" default:"https://overpass-api.de/api/interpreter"`

	// Photon ジオコーディングAPI
	PhotonBaseURL string `envconfig:"PHOTON_BASE_URL" default:"https://photon.komoot.io"`

	// サーバー設定
	Port int `envconfig:"PORT" default:"8000"`
}

// Load は環境変数から設定を読み込んで返す．
// プレフィックス BTD_ が付いた環境変数を対応するフィールドにマッピングする．
// PORT のみ Railway 等の PaaS 互換のためプレフィックスなしの環境変数も受け付ける．
func Load() (*Settings, error) {
	var s Settings
	if err := envconfig.Process("BTD", &s); err != nil {
		return nil, err
	}
	// Railway 等の PaaS は PORT をプレフィックスなしで設定する．
	// BTD_PORT が未設定かつ PORT が設定されている場合はそちらを優先する．
	if os.Getenv("BTD_PORT") == "" {
		if p := os.Getenv("PORT"); p != "" {
			if v, err := strconv.Atoi(p); err == nil {
				s.Port = v
			}
		}
	}
	return &s, nil
}
