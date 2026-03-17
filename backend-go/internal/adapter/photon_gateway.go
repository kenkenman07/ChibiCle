package adapter

import (
	"btd/internal/domain"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// PhotonGateway は Photon API を使用した GeocodingService の実装．
// 地名検索の結果を緯度・経度・表示名の形式で返す．
type PhotonGateway struct {
	baseURL    string       // Photon APIのベースURL
	httpClient *http.Client // 共有HTTPクライアント
	limiter    rateLimiter  // Photon APIの利用規約に従うレートリミッター
}

// rateLimiter は指定間隔でリクエストをスロットリングするシンプルなリミッター．
// Photon API は1秒あたり1リクエストを推奨している．
type rateLimiter struct {
	mu       sync.Mutex
	interval time.Duration
	lastReq  time.Time
}

// wait は前回リクエストから interval が経過するまでブロックする．
func (rl *rateLimiter) wait() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	elapsed := time.Since(rl.lastReq)
	if elapsed < rl.interval {
		time.Sleep(rl.interval - elapsed)
	}
	rl.lastReq = time.Now()
}

func NewPhotonGateway(baseURL string, client *http.Client) *PhotonGateway {
	return &PhotonGateway{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: client,
		limiter:    rateLimiter{interval: time.Second},
	}
}

// Search は Photon API で地名検索を実行し，結果を返す．
// 日本語ロケールかつ東京中心のバイアス付きで検索する．
// エラー時はハンドラー層が空配列を返すため，ユーザーには影響しない．
func (g *PhotonGateway) Search(ctx context.Context, query string, limit int) ([]domain.GeocodingResult, error) {
	params := url.Values{
		"q": {query},
		// "lang":  {"ja"},
		"limit": {strconv.Itoa(limit)},
		"lat":   {"35.6812"}, // 東京中心（結果の近接バイアス用）
		"lon":   {"139.7671"},
	}

	// レートリミッターで間隔を制御
	g.limiter.wait()

	reqURL := g.baseURL + "/api/?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := g.httpClient.Do(req)
	if err != nil {
		slog.Warn("Photon API エラー", "error", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Warn("Photon API HTTPエラー", "status", resp.StatusCode)
		return nil, nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Photon の GeoJSON レスポンスをパース
	var geoJSON photonResponse
	if err := json.Unmarshal(body, &geoJSON); err != nil {
		return nil, err
	}

	// GeoJSON Features を GeocodingResult に変換
	results := make([]domain.GeocodingResult, 0, len(geoJSON.Features))
	for _, f := range geoJSON.Features {
		if len(f.Geometry.Coordinates) < 2 {
			continue
		}
		// 表示名を「名称, 市区町村, 都道府県」の形式で構築
		parts := make([]string, 0, 3)
		if f.Properties.Name != "" {
			parts = append(parts, f.Properties.Name)
		}
		if f.Properties.City != "" {
			parts = append(parts, f.Properties.City)
		}
		if f.Properties.State != "" {
			parts = append(parts, f.Properties.State)
		}
		displayName := strings.Join(parts, ", ")
		if displayName == "" {
			displayName = f.Properties.Country
		}
		results = append(results, domain.GeocodingResult{
			Lat:         f.Geometry.Coordinates[1], // GeoJSON は [lng, lat] の順
			Lng:         f.Geometry.Coordinates[0],
			DisplayName: displayName,
		})
	}
	return results, nil
}

// --- Photon GeoJSON レスポンス型 ---

type photonResponse struct {
	Features []photonFeature `json:"features"`
}

type photonFeature struct {
	Geometry   photonGeometry   `json:"geometry"`
	Properties photonProperties `json:"properties"`
}

type photonGeometry struct {
	Coordinates []float64 `json:"coordinates"` // GeoJSON形式: [lng, lat]
}

type photonProperties struct {
	Name    string `json:"name"`
	City    string `json:"city"`
	State   string `json:"state"`
	Country string `json:"country"`
}
