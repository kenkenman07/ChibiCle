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

const (
	geocodeCacheMax = 1000
	geocodeCacheTTL = 5 * time.Minute
)

type geocodeCacheEntry struct {
	results   []domain.GeocodingResult
	expiresAt time.Time
}

// PhotonGateway は Photon API を使用した GeocodingService の実装．
// 地名検索の結果を緯度・経度・表示名の形式で返す．
// 同一クエリの繰り返し問い合わせを避けるため，TTL 付きインメモリキャッシュを持つ．
type PhotonGateway struct {
	baseURL    string       // Photon APIのベースURL
	httpClient *http.Client // 共有HTTPクライアント
	limiter    rateLimiter  // Photon APIの利用規約に従うレートリミッター

	cacheMu    sync.RWMutex
	cache      map[string]geocodeCacheEntry
	cacheOrder []string
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
		cache:      make(map[string]geocodeCacheEntry),
	}
}

// Search は Photon API で地名検索を実行し，結果を返す．
// 日本語ロケールかつ東京中心のバイアス付きで検索する．
// エラー時はハンドラー層が空配列を返すため，ユーザーには影響しない．
// 同一クエリ（正規化済み）に対してはキャッシュから即座に返す．
func (g *PhotonGateway) Search(ctx context.Context, query string, limit int) ([]domain.GeocodingResult, error) {
	cacheKey := strings.ToLower(strings.TrimSpace(query)) + "\x00" + strconv.Itoa(limit)

	g.cacheMu.RLock()
	if entry, ok := g.cache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		g.cacheMu.RUnlock()
		slog.Info("Photon キャッシュヒット", "query", query, "results", len(entry.results))
		return entry.results, nil
	}
	g.cacheMu.RUnlock()

	params := url.Values{
		"q": {query},
		// "lang":  {"ja"},
		"limit": {strconv.Itoa(limit)},
		"lat":   {"35.6812"}, // 東京中心（結果の近接バイアス用）
		"lon":   {"139.7671"},
	}

	g.limiter.wait()

	t0 := time.Now()
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

	var geoJSON photonResponse
	if err := json.Unmarshal(body, &geoJSON); err != nil {
		return nil, err
	}

	results := make([]domain.GeocodingResult, 0, len(geoJSON.Features))
	for _, f := range geoJSON.Features {
		if len(f.Geometry.Coordinates) < 2 {
			continue
		}
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
			Lat:         f.Geometry.Coordinates[1],
			Lng:         f.Geometry.Coordinates[0],
			DisplayName: displayName,
		})
	}

	slog.Info("Photon", "duration_s", time.Since(t0).Seconds(), "query", query, "results", len(results))

	g.writeGeocodeCache(cacheKey, results)
	return results, nil
}

func (g *PhotonGateway) writeGeocodeCache(key string, results []domain.GeocodingResult) {
	g.cacheMu.Lock()
	defer g.cacheMu.Unlock()

	g.cache[key] = geocodeCacheEntry{
		results:   results,
		expiresAt: time.Now().Add(geocodeCacheTTL),
	}
	g.cacheOrder = append(g.cacheOrder, key)

	if len(g.cache) > geocodeCacheMax {
		excess := len(g.cache) - geocodeCacheMax
		for _, k := range g.cacheOrder[:excess] {
			delete(g.cache, k)
		}
		remaining := make([]string, len(g.cacheOrder)-excess)
		copy(remaining, g.cacheOrder[excess:])
		g.cacheOrder = remaining
	}
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
