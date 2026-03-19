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
	baseURL                       string       // OSRM APIのベースURL
	profile                       string       // OSRM profile名（例: bike）
	minRoads                      int          // 交差点とみなす最小道路数
	filterNonPublicRoads          bool         // 公道以外の交差点を除外するか
	filterSignalizedIntersections bool         // 信号付き交差点を除外するか
	overpassURL                   string       // Overpass APIのURL
	httpClient                    *http.Client // 共有HTTPクライアント

	mu               sync.RWMutex // ノードキャッシュの排他制御
	nodeCache        map[int]bool // OSMノードID → 公道上にあるか
	nodeCacheOrder   []int        // FIFO eviction 用の挿入順序
	signalCache      map[int]bool // 交差点のOSMノードID → 接続公道上に signal 関連要素があるか
	signalCacheOrder []int        // FIFO eviction 用の挿入順序
}

func NewOsrmGateway(baseURL, profile string, minRoads int, filterNonPublicRoads, filterSignalizedIntersections bool, overpassURL string, client *http.Client) *OsrmGateway {
	return &OsrmGateway{
		baseURL:                       strings.TrimRight(baseURL, "/"),
		profile:                       normalizeOsrmProfile(profile),
		minRoads:                      minRoads,
		filterNonPublicRoads:          filterNonPublicRoads,
		filterSignalizedIntersections: filterSignalizedIntersections,
		overpassURL:                   overpassURL,
		httpClient:                    client,
		nodeCache:                     make(map[int]bool),
		signalCache:                   make(map[int]bool),
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

// annotatedCoord は経路ジオメトリ上の座標と対応する OSM ノード ID のペア．
// annotation.nodes と geometry.coordinates の位置インデックス対応を保持し，
// 完全一致マッチが失敗した場合の最近傍フォールバックに使用する．
type annotatedCoord struct {
	lat, lng float64
	nodeID   int
}

// nearestNodeThresholdM は最近傍フォールバック時の許容距離（メートル）．
// OSRM の intersection location と geometry coordinate は同一 OSM ノードを指すため
// 通常は 1m 未満のずれだが，ジオメトリ圧縮等に備えて余裕をもたせている．
const nearestNodeThresholdM = 10.0

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
	annotatedCoords := make([]annotatedCoord, 0, len(annotationNodes))
	for i, nodeID := range annotationNodes {
		if i < len(osrmR.Geometry.Coordinates) {
			c := osrmR.Geometry.Coordinates[i]
			lat, lng := c[1], c[0]
			key := [2]float64{roundTo6(lat), roundTo6(lng)}
			coordToNode[key] = nodeID
			annotatedCoords = append(annotatedCoords, annotatedCoord{lat: lat, lng: lng, nodeID: nodeID})
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
				if !ok {
					nodeID = findNearestAnnotationNode(lat, lng, annotatedCoords, nearestNodeThresholdM)
				}
				isecNodeIDs = append(isecNodeIDs, nodeID)
				idx++
			}
		}
	}

	// Overpass フィルタ: 設定に応じて公道外または信号付き交差点を除外する
	if (g.filterNonPublicRoads || g.filterSignalizedIntersections) && len(intersections) > 0 {
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

type intersectionNodePair struct {
	isec   domain.Intersection
	nodeID int
}

// filterPublicRoadIntersections は設定に応じて交差点リストから公道外または信号付きのものを除外する．
// OSMノードIDが取得できなかった交差点（unknown）は安全側に残す．
func (g *OsrmGateway) filterPublicRoadIntersections(ctx context.Context, intersections []domain.Intersection, nodeIDs []int) ([]domain.Intersection, error) {
	// ノードIDの有無で known/unknown に分類
	known, unknown := splitIntersectionsByNodeID(intersections, nodeIDs)

	if len(known) == 0 {
		slog.Info("公道フィルタ: OSMノードID取得不可 — スキップ")
		return intersections, nil
	}

	allNIDs := collectIntersectionNodeIDs(known)

	// Overpass API で公道・信号交差点を同時判定（キャッシュ付き）
	t0 := time.Now()
	overpass, err := g.resolvePublicNodes(ctx, allNIDs)
	if err != nil {
		return nil, err
	}
	slog.Info("公道・信号判定", "duration", time.Since(t0).Seconds())

	// 設定に応じて公道外交差点・signal 関連要素のある交差点を除外し，unknown は安全側に含める
	before := len(intersections)
	filtered, signalCount, nonPublicCount := g.applyIntersectionFilters(known, unknown, overpass)

	// index を0から振り直す
	result := reindexIntersections(filtered)
	slog.Info(
		"公道・信号フィルタ",
		"before", before,
		"after", len(result),
		"filter_non_public", g.filterNonPublicRoads,
		"filter_signalized", g.filterSignalizedIntersections,
		"removed_non_public", nonPublicCount,
		"removed_signals", signalCount,
	)
	return result, nil
}

// resolvePublicNodes はノードIDリストについて公道上にあるか・signal 関連交差点かを判定する．
// 信号判定は中心nodeだけでなく，接続公道 way 上の signal 関連 node も含めて評価する．
// 公道判定と信号判定は別キャッシュで保持し，どちらかが未判定のノードだけ Overpass API に問い合わせる．
func (g *OsrmGateway) resolvePublicNodes(ctx context.Context, nodeIDs []int) (*overpassResult, error) {
	result, uncached, publicHits, signalHits := g.readCachedOverpassResult(nodeIDs)

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
	g.writeCachedOverpassResult(uncached, queried)
	mergeOverpassResult(result, queried)
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
	// 2. その公道 way 上の歩行者信号付き横断歩道 (crossing=traffic_signals) node を取得
	//    車両用信号 (highway=traffic_signals) は除外対象にしない
	query := fmt.Sprintf(
		`[out:json][timeout:10];node(id:%s)->.isec;way(bn.isec)["highway"~"^(%s)$"]->.public;.public out skel qt;(node.isec["crossing"="traffic_signals"];node(w.public)["crossing"="traffic_signals"];);out tags qt;`,
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
	markSignalizedIntersections(result.SignalNodes, publicWays, nodeIDSet, signalTaggedNodes)

	slog.Info("Overpass", "queried", len(nodeIDs), "public", len(result.PublicNodes), "signals", len(result.SignalNodes))
	return result, nil
}

// roundTo6 は浮動小数点数を小数点以下6桁に丸める．
// 座標の重複判定で使用する（約0.1mの精度）．
func roundTo6(v float64) float64 {
	return math.Round(v*1e6) / 1e6
}

// findNearestAnnotationNode は annotatedCoords を線形走査し，
// (lat, lng) に最も近い座標の nodeID を返す．
// 最近傍が thresholdM 以内であればその nodeID を返し，超過時は 0 を返す．
func findNearestAnnotationNode(lat, lng float64, coords []annotatedCoord, thresholdM float64) int {
	bestDist := math.MaxFloat64
	bestID := 0
	for _, ac := range coords {
		d := domain.DistanceM(lat, lng, ac.lat, ac.lng)
		if d < bestDist {
			bestDist = d
			bestID = ac.nodeID
		}
	}
	if bestDist <= thresholdM {
		slog.Debug("intersection→node: fallback nearest match",
			"dist_m", bestDist, "nodeID", bestID,
			"isec_lat", lat, "isec_lng", lng)
		return bestID
	}
	slog.Warn("intersection→node: no match within threshold",
		"best_dist_m", bestDist, "threshold_m", thresholdM,
		"isec_lat", lat, "isec_lng", lng)
	return 0
}

func splitIntersectionsByNodeID(intersections []domain.Intersection, nodeIDs []int) ([]intersectionNodePair, []domain.Intersection) {
	var known []intersectionNodePair
	var unknown []domain.Intersection
	for i, isec := range intersections {
		nid := nodeIDs[i]
		if nid != 0 {
			known = append(known, intersectionNodePair{isec: isec, nodeID: nid})
		} else {
			unknown = append(unknown, isec)
		}
	}
	return known, unknown
}

func collectIntersectionNodeIDs(known []intersectionNodePair) []int {
	nodeIDs := make([]int, len(known))
	for i, p := range known {
		nodeIDs[i] = p.nodeID
	}
	return nodeIDs
}

func (g *OsrmGateway) applyIntersectionFilters(known []intersectionNodePair, unknown []domain.Intersection, overpass *overpassResult) ([]domain.Intersection, int, int) {
	filtered := make([]domain.Intersection, 0, len(known)+len(unknown))
	var signalCount int
	var nonPublicCount int

	for _, p := range known {
		if g.filterNonPublicRoads && !overpass.PublicNodes[p.nodeID] {
			nonPublicCount++
			continue
		}
		if g.filterSignalizedIntersections && overpass.SignalNodes[p.nodeID] {
			signalCount++
			continue
		}
		filtered = append(filtered, p.isec)
	}

	filtered = append(filtered, unknown...)
	return filtered, signalCount, nonPublicCount
}

func reindexIntersections(intersections []domain.Intersection) []domain.Intersection {
	result := make([]domain.Intersection, len(intersections))
	for i, isec := range intersections {
		result[i] = domain.Intersection{
			Index:    i,
			Lat:      isec.Lat,
			Lng:      isec.Lng,
			NumRoads: isec.NumRoads,
		}
	}
	return result
}

func (g *OsrmGateway) readCachedOverpassResult(nodeIDs []int) (*overpassResult, []int, int, int) {
	result := &overpassResult{
		PublicNodes: make(map[int]bool, len(nodeIDs)),
		SignalNodes: make(map[int]bool),
	}
	var uncached []int
	publicHits := 0
	signalHits := 0

	g.mu.RLock()
	defer g.mu.RUnlock()

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

	return result, uncached, publicHits, signalHits
}

func (g *OsrmGateway) writeCachedOverpassResult(nodeIDs []int, queried *overpassResult) {
	g.mu.Lock()
	defer g.mu.Unlock()

	for _, nid := range nodeIDs {
		_, isPublic := queried.PublicNodes[nid]
		g.nodeCache[nid] = isPublic
		g.nodeCacheOrder = append(g.nodeCacheOrder, nid)

		_, hasSignal := queried.SignalNodes[nid]
		g.signalCache[nid] = hasSignal
		g.signalCacheOrder = append(g.signalCacheOrder, nid)
	}
	g.nodeCacheOrder = trimCache(g.nodeCache, g.nodeCacheOrder)
	g.signalCacheOrder = trimCache(g.signalCache, g.signalCacheOrder)
}

func mergeOverpassResult(dst, src *overpassResult) {
	for nid := range src.PublicNodes {
		dst.PublicNodes[nid] = true
	}
	for nid := range src.SignalNodes {
		dst.SignalNodes[nid] = true
	}
}

// signalMaxHops は way ノード列上で交差点ノードから信号ノードまでの
// 許容インデックス距離．この範囲外の信号は別の交差点のものとみなす．
// 信号タグは交差点ノード自体 (0 hop) か直隣接ノード (1 hop) に付くため，
// 1 に設定することで隣接交差点への波及を防ぐ．
const signalMaxHops = 1

func markSignalizedIntersections(signalNodes map[int]bool, publicWays [][]int, nodeIDSet map[int]bool, signalTaggedNodes map[int]bool) {
	for _, wayNodes := range publicWays {
		for i, nid := range wayNodes {
			if !nodeIDSet[nid] {
				continue
			}
			lo := max(0, i-signalMaxHops)
			hi := min(len(wayNodes)-1, i+signalMaxHops)
			for j := lo; j <= hi; j++ {
				if signalTaggedNodes[wayNodes[j]] {
					signalNodes[nid] = true
					break
				}
			}
		}
	}
}

func isSignalTagged(tags map[string]string) bool {
	return tags["crossing"] == "traffic_signals"
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
