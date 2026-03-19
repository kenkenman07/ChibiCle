package adapter

import (
	"btd/internal/domain"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// 公道と判定する highway タグの種類一覧．
// 歩行者専用道路やサービス道路は含まない．
var publicRoadTypes = []string{
	"trunk", "trunk_link",
	"primary", "primary_link",
	"secondary", "secondary_link",
	"tertiary", "tertiary_link",
	"unclassified",
	"residential",
	"living_street",
}

// highwayRegex は Overpass QL で使用する highway タグの正規表現．
// 起動時に一度だけ構築する．
var highwayRegex = strings.Join(publicRoadTypes, "|")

// nodeCacheMax は Overpass 判定キャッシュの最大エントリ数．
const nodeCacheMax = 50_000

// OsrmGateway は OSRM（自転車ルーティング）と Overpass API（公道・信号判定）を
// 組み合わせた RoutingService の実装．
type OsrmGateway struct {
	baseURL              string       // OSRM APIのベースURL
	profile              string       // OSRM profile名（例: bike）
	minRoads             int          // 交差点とみなす最小道路数
	filterNonPublicRoads bool         // 互換性のため名称はそのまま。実際には公道・信号フィルタを有効にする
	overpassURL          string       // Overpass APIのURL
	httpClient           *http.Client // 共有HTTPクライアント

	mu               sync.RWMutex // ノードキャッシュの排他制御
	nodeCache        map[int]bool // OSMノードID → 公道上にあるか
	nodeCacheOrder   []int        // FIFO eviction 用の挿入順序
	signalCache      map[int]bool // 交差点のOSMノードID → 接続公道上に signal 関連要素があるか
	signalCacheOrder []int        // FIFO eviction 用の挿入順序
}

func NewOsrmGateway(baseURL, profile string, minRoads int, filterNonPublicRoads bool, overpassURL string, client *http.Client) *OsrmGateway {
	return &OsrmGateway{
		baseURL:              strings.TrimRight(baseURL, "/"),
		profile:              normalizeOsrmProfile(profile),
		minRoads:             minRoads,
		filterNonPublicRoads: filterNonPublicRoads,
		overpassURL:          overpassURL,
		httpClient:           client,
		nodeCache:            make(map[int]bool),
		signalCache:          make(map[int]bool),
	}
}

// GetBicycleRoute は domain.RoutingService インターフェースの実装．
func (g *OsrmGateway) GetBicycleRoute(ctx context.Context, origin, destination domain.LatLng) (*domain.Route, error) {
	return g.doRoute(ctx, origin, destination)
}

// --- OSRM JSON レスポンス型 ---

type osrmResponse struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Routes  []osrmRoute `json:"routes"`
}

type osrmRoute struct {
	Distance float64      `json:"distance"`
	Duration float64      `json:"duration"`
	Geometry osrmGeometry `json:"geometry"`
	Legs     []osrmLeg    `json:"legs"`
}

type osrmGeometry struct {
	Coordinates [][]float64 `json:"coordinates"` // GeoJSON形式: [lng, lat]
}

type osrmLeg struct {
	Steps      []osrmStep      `json:"steps"`
	Annotation *osrmAnnotation `json:"annotation"`
}

type osrmAnnotation struct {
	Nodes []float64 `json:"nodes"` // 経路上のOSMノードID列
}

type osrmStep struct {
	Intersections []osrmIntersection `json:"intersections"`
}

type osrmIntersection struct {
	Location []float64 `json:"location"` // [lng, lat]
	Bearings []int     `json:"bearings"` // 各方向の方位角．要素数=合流する道路数
}

type overpassResponse struct {
	Elements []overpassElement `json:"elements"`
}

type overpassElement struct {
	Type  string            `json:"type"`
	ID    int               `json:"id"`    // node の場合のノードID
	Nodes []int             `json:"nodes"` // way に含まれるノードID列
	Tags  map[string]string `json:"tags"`  // node/way のタグ
}

// doRoute は OSRM API を呼び出し，ルートと交差点を抽出する．
func (g *OsrmGateway) doRoute(ctx context.Context, origin, destination domain.LatLng) (*domain.Route, error) {
	// OSRM は lng,lat の順で座標を受け取る
	coords := fmt.Sprintf("%f,%f;%f,%f", origin.Lng, origin.Lat, destination.Lng, destination.Lat)
	reqURL := fmt.Sprintf("%s/route/v1/%s/%s?steps=true&geometries=geojson&overview=full&annotations=nodes", g.baseURL, g.profile, coords)

	t0 := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, &domain.OsrmRoutingError{Message: "リクエスト作成に失敗"}
	}

	resp, err := g.httpClient.Do(req)
	if err != nil {
		slog.Error("OSRM リクエストエラー", "error", err)
		return nil, &domain.OsrmRoutingError{Message: "ルーティングサーバーに接続できません"}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("OSRM HTTPエラー", "status", resp.StatusCode)
		return nil, &domain.OsrmRoutingError{Message: fmt.Sprintf("ルーティングサーバーがエラーを返しました (HTTP %d)", resp.StatusCode)}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &domain.OsrmRoutingError{Message: "レスポンスの読み取りに失敗"}
	}

	var data osrmResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, &domain.OsrmRoutingError{Message: "レスポンスのパースに失敗"}
	}
	slog.Info("OSRM", "duration", time.Since(t0).Seconds())

	if data.Code != "Ok" {
		msg := data.Message
		if msg == "" {
			msg = "不明なエラー"
		}
		return nil, &domain.OsrmRoutingError{Message: fmt.Sprintf("ルートが見つかりません: %s", msg)}
	}

	osrmR := data.Routes[0]

	// ジオメトリ抽出: GeoJSON [lng, lat] → 内部形式 [lat, lng] に変換
	geometry := make([]domain.LatLng, len(osrmR.Geometry.Coordinates))
	for i, c := range osrmR.Geometry.Coordinates {
		geometry[i] = domain.LatLng{Lat: c[1], Lng: c[0]}
	}

	// annotation.nodes から座標→OSMノードIDのマッピングを構築
	// 公道フィルタで各交差点のノードIDが必要になるため
	var annotationNodes []int
	for _, leg := range osrmR.Legs {
		if leg.Annotation != nil {
			for _, n := range leg.Annotation.Nodes {
				annotationNodes = append(annotationNodes, int(n))
			}
		}
	}

	coordToNode := make(map[[2]float64]int)
	for i, nodeID := range annotationNodes {
		if i < len(osrmR.Geometry.Coordinates) {
			c := osrmR.Geometry.Coordinates[i]
			key := [2]float64{roundTo6(c[1]), roundTo6(c[0])}
			coordToNode[key] = nodeID
		}
	}

	// 交差点抽出: bearings数が閾値以上のノードを交差点として採用
	var intersections []domain.Intersection
	var isecNodeIDs []int
	seen := make(map[[2]float64]bool) // 座標の重複排除用
	idx := 0

	for _, leg := range osrmR.Legs {
		for _, step := range leg.Steps {
			for _, isec := range step.Intersections {
				if len(isec.Bearings) < g.minRoads {
					continue // 道路数が足りない（交差点ではない）
				}
				lat, lng := isec.Location[1], isec.Location[0]
				key := [2]float64{roundTo6(lat), roundTo6(lng)}
				if seen[key] {
					continue // 同一座標の重複を除外
				}
				seen[key] = true
				intersections = append(intersections, domain.Intersection{
					Index:    idx,
					Lat:      lat,
					Lng:      lng,
					NumRoads: len(isec.Bearings),
				})
				nodeID, ok := coordToNode[key]
				if ok {
					isecNodeIDs = append(isecNodeIDs, nodeID)
				} else {
					isecNodeIDs = append(isecNodeIDs, 0) // マッピングが見つからない場合は 0
				}
				idx++
			}
		}
	}

	// 公道フィルタ: Overpass API で公道上の交差点のみに絞り込む
	if g.filterNonPublicRoads && len(intersections) > 0 {
		filtered, err := g.filterPublicRoadIntersections(ctx, intersections, isecNodeIDs)
		if err != nil {
			slog.Warn("Overpass APIクエリ失敗 — フィルタなしで全交差点を返します", "error", err)
		} else {
			intersections = filtered
		}
	}

	return &domain.Route{
		Geometry:      geometry,
		Intersections: intersections,
		DistanceM:     osrmR.Distance,
		DurationS:     osrmR.Duration,
	}, nil
}

// --- Overpass API による公道フィルタリング ---

// filterPublicRoadIntersections は交差点リストから公道外または信号付きのものを除外する．
// OSMノードIDが取得できなかった交差点（unknown）は安全側に残す．
func (g *OsrmGateway) filterPublicRoadIntersections(ctx context.Context, intersections []domain.Intersection, nodeIDs []int) ([]domain.Intersection, error) {
	type pair struct {
		isec   domain.Intersection
		nodeID int
	}

	// ノードIDの有無で known/unknown に分類
	var known []pair
	var unknown []domain.Intersection
	for i, isec := range intersections {
		nid := nodeIDs[i]
		if nid != 0 {
			known = append(known, pair{isec, nid})
		} else {
			unknown = append(unknown, isec)
		}
	}

	if len(known) == 0 {
		slog.Info("公道フィルタ: OSMノードID取得不可 — スキップ")
		return intersections, nil
	}

	allNIDs := make([]int, len(known))
	for i, p := range known {
		allNIDs[i] = p.nodeID
	}

	// Overpass API で公道・信号交差点を同時判定（キャッシュ付き）
	t0 := time.Now()
	overpass, err := g.resolvePublicNodes(ctx, allNIDs)
	if err != nil {
		return nil, err
	}
	slog.Info("公道・信号判定", "duration", time.Since(t0).Seconds())

	// 公道上かつ signal 関連要素のない交差点のみ残し，unknown は安全側に含める
	before := len(intersections)
	var filtered []domain.Intersection
	var signalCount int
	for _, p := range known {
		if !overpass.PublicNodes[p.nodeID] {
			continue // 公道上にない
		}
		if overpass.SignalNodes[p.nodeID] {
			signalCount++
			continue // 信号あり — 除外
		}
		filtered = append(filtered, p.isec)
	}
	filtered = append(filtered, unknown...)

	// index を0から振り直す
	result := make([]domain.Intersection, len(filtered))
	for i, f := range filtered {
		result[i] = domain.Intersection{Index: i, Lat: f.Lat, Lng: f.Lng, NumRoads: f.NumRoads}
	}
	slog.Info("公道・信号フィルタ", "before", before, "after", len(result), "removed_non_public", before-len(result)-signalCount, "removed_signals", signalCount)
	return result, nil
}

// resolvePublicNodes はノードIDリストについて公道上にあるか・signal 関連交差点かを判定する．
// 信号判定は中心nodeだけでなく，接続公道 way 上の signal 関連 node も含めて評価する．
// 公道判定と信号判定は別キャッシュで保持し，どちらかが未判定のノードだけ Overpass API に問い合わせる．
func (g *OsrmGateway) resolvePublicNodes(ctx context.Context, nodeIDs []int) (*overpassResult, error) {
	result := &overpassResult{
		PublicNodes: make(map[int]bool, len(nodeIDs)),
		SignalNodes: make(map[int]bool),
	}
	var uncached []int
	publicHits := 0
	signalHits := 0

	// キャッシュから読み取り（読み取りロック）
	g.mu.RLock()
	for _, nid := range nodeIDs {
		publicVal, publicCached := g.nodeCache[nid]
		signalVal, signalCached := g.signalCache[nid]
		if publicCached {
			publicHits++
		}
		if signalCached {
			signalHits++
		}
		if publicCached && publicVal {
			result.PublicNodes[nid] = true
		}
		if signalCached && signalVal {
			result.SignalNodes[nid] = true
		}
		if !publicCached || !signalCached {
			uncached = append(uncached, nid)
		}
	}
	g.mu.RUnlock()

	if len(uncached) == 0 {
		slog.Info("公道・信号キャッシュ: 全ヒット (Overpassスキップ)", "total", len(nodeIDs))
		return result, nil
	}
	slog.Info(
		"公道・信号キャッシュ",
		"public_hit", publicHits,
		"signal_hit", signalHits,
		"total", len(nodeIDs),
		"query", len(uncached),
	)

	// キャッシュミス分を Overpass API で問い合わせ（公道+信号を同時取得）
	queried, err := g.queryPublicRoadNodes(ctx, uncached)
	if err != nil {
		return nil, err
	}

	// キャッシュを更新（書き込みロック）
	g.mu.Lock()
	for _, nid := range uncached {
		_, isPublic := queried.PublicNodes[nid]
		g.nodeCache[nid] = isPublic
		g.nodeCacheOrder = append(g.nodeCacheOrder, nid)

		_, hasSignal := queried.SignalNodes[nid]
		g.signalCache[nid] = hasSignal
		g.signalCacheOrder = append(g.signalCacheOrder, nid)
	}
	g.nodeCacheOrder = trimCache(g.nodeCache, g.nodeCacheOrder)
	g.signalCacheOrder = trimCache(g.signalCache, g.signalCacheOrder)
	g.mu.Unlock()

	for nid := range queried.PublicNodes {
		result.PublicNodes[nid] = true
	}
	for nid := range queried.SignalNodes {
		result.SignalNodes[nid] = true
	}
	return result, nil
}

// overpassResult は Overpass API クエリの結果を格納する．
// 公道判定と signal 関連交差点判定の両方の結果を1回のクエリで取得する．
type overpassResult struct {
	PublicNodes map[int]bool // 公道上にある交差点ノード
	SignalNodes map[int]bool // signal 関連要素を持つ公道に接続している交差点ノード
}

// queryPublicRoadNodes は Overpass API にノードIDリストを問い合わせ，
// 公道判定と signal 関連交差点判定を1回のクエリで行う．
// 429 レートリミット時は指数バックオフで最大3回リトライする．
func (g *OsrmGateway) queryPublicRoadNodes(ctx context.Context, nodeIDs []int) (*overpassResult, error) {
	// ノードIDリストをカンマ区切り文字列に変換
	var sb strings.Builder
	for i, nid := range nodeIDs {
		if i > 0 {
			sb.WriteByte(',')
		}
		sb.WriteString(strconv.Itoa(nid))
	}

	// Overpass QL クエリ:
	// 1. 指定ノードを含む公道 way を取得
	// 2. その公道 way 上の signal 関連 node を取得
	query := fmt.Sprintf(
		`[out:json][timeout:10];node(id:%s)->.isec;way(bn.isec)["highway"~"^(%s)$"]->.public;.public out skel qt;(node.isec["highway"="traffic_signals"];node(w.public)["highway"="traffic_signals"];node(w.public)["crossing"="traffic_signals"];node(w.public)[~"^traffic_signals(:.*)?$"~".*"];);out tags qt;`,
		sb.String(), highwayRegex,
	)

	const maxRetries = 3
	var respBody []byte

	for attempt := 0; attempt <= maxRetries; attempt++ {
		formData := url.Values{"data": {query}}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.overpassURL, strings.NewReader(formData.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := g.httpClient.Do(req)
		if err != nil {
			return nil, err
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close() // 全パスで確実に閉じる

		// 429 レートリミット時は指数バックオフでリトライ
		if resp.StatusCode == http.StatusTooManyRequests && attempt < maxRetries {
			wait := time.Duration(1<<attempt) * time.Second
			slog.Warn("Overpass 429 レートリミット", "wait_sec", wait.Seconds(), "attempt", attempt+1, "max", maxRetries)
			time.Sleep(wait)
			continue
		}

		if readErr != nil {
			return nil, readErr
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("overpass HTTP %d", resp.StatusCode)
		}
		respBody = body
		break
	}

	// レスポンスをパースし，way/node を種別ごとに処理
	var data overpassResponse
	if err := json.Unmarshal(respBody, &data); err != nil {
		return nil, err
	}

	nodeIDSet := make(map[int]bool, len(nodeIDs))
	for _, nid := range nodeIDs {
		nodeIDSet[nid] = true
	}

	result := &overpassResult{
		PublicNodes: make(map[int]bool),
		SignalNodes: make(map[int]bool),
	}
	signalTaggedNodes := make(map[int]bool)
	publicWays := make([][]int, 0)
	for _, elem := range data.Elements {
		switch elem.Type {
		case "way":
			publicWays = append(publicWays, elem.Nodes)
			for _, nid := range elem.Nodes {
				if nodeIDSet[nid] {
					result.PublicNodes[nid] = true
				}
			}
		case "node":
			if isSignalTagged(elem.Tags) {
				signalTaggedNodes[elem.ID] = true
			}
		}
	}

	for _, wayNodes := range publicWays {
		hasSignalOnWay := false
		hasQueriedNode := false
		for _, nid := range wayNodes {
			if signalTaggedNodes[nid] {
				hasSignalOnWay = true
			}
			if nodeIDSet[nid] {
				hasQueriedNode = true
			}
		}
		if !hasSignalOnWay || !hasQueriedNode {
			continue
		}
		for _, nid := range wayNodes {
			if nodeIDSet[nid] {
				result.SignalNodes[nid] = true
			}
		}
	}

	slog.Info("Overpass", "queried", len(nodeIDs), "public", len(result.PublicNodes), "signals", len(result.SignalNodes))
	return result, nil
}

// roundTo6 は浮動小数点数を小数点以下6桁に丸める．
// 座標の重複判定で使用する（約0.1mの精度）．
func roundTo6(v float64) float64 {
	return math.Round(v*1e6) / 1e6
}

func isSignalTagged(tags map[string]string) bool {
	if len(tags) == 0 {
		return false
	}
	if tags["highway"] == "traffic_signals" {
		return true
	}
	if tags["crossing"] == "traffic_signals" {
		return true
	}
	for key := range tags {
		if key == "traffic_signals" || strings.HasPrefix(key, "traffic_signals:") {
			return true
		}
	}
	return false
}

func trimCache(cache map[int]bool, order []int) []int {
	// 新しいスライスにコピーして古いバッキング配列をGC可能にする
	if len(cache) <= nodeCacheMax {
		return order
	}

	excess := len(cache) - nodeCacheMax
	for _, k := range order[:excess] {
		delete(cache, k)
	}
	remaining := make([]int, len(order)-excess)
	copy(remaining, order[excess:])
	return remaining
}

func normalizeOsrmProfile(profile string) string {
	profile = strings.TrimSpace(strings.ToLower(profile))
	switch profile {
	case "", "bicycle":
		return "bike"
	default:
		return profile
	}
}
