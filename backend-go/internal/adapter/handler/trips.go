// handler パッケージはHTTPリクエストの受付・レスポンス生成を担う．
// ビジネスロジックは持たず，domain 層のインターフェースを通じて処理を委譲する．
package handler

import (
	"btd/internal/domain"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// --- リクエスト型 ---

// tripCreateRequest はトリップ作成時のリクエストボディ．
// 目的地は任意（後からルート計画時に使用）．
type tripCreateRequest struct {
	DestinationLat *float64 `json:"destination_lat,omitempty"`
	DestinationLng *float64 `json:"destination_lng,omitempty"`
}

// routeRequest はルート計画時のリクエストボディ．出発地の座標を指定する．
type routeRequest struct {
	OriginLat float64 `json:"origin_lat"`
	OriginLng float64 `json:"origin_lng"`
}

// tripEndRequest はトリップ終了時のリクエストボディ．走行距離は任意．
type tripEndRequest struct {
	DistanceM *float64 `json:"distance_m,omitempty"`
}

// --- レスポンス型 ---

// tripOut はトリップのJSON出力形式．ルート情報を含む場合がある．
type tripOut struct {
	ID             string    `json:"id"`
	StartedAt      string    `json:"started_at"`
	EndedAt        *string   `json:"ended_at"`
	DistanceM      float64   `json:"distance_m"`
	DestinationLat *float64  `json:"destination_lat"`
	DestinationLng *float64  `json:"destination_lng"`
	Route          *routeOut `json:"route"` // ルート未設定時は null
}

type routePlanOut struct {
	ID    string   `json:"id"`
	Route routeOut `json:"route"`
}

// routeOut はルートのJSON出力形式．
type routeOut struct {
	Geometry      [][]float64       `json:"geometry"`      // [[lat, lng], ...] の座標列
	Intersections []intersectionOut `json:"intersections"` // 交差点リスト
	DistanceM     float64           `json:"distance_m"`    // 総距離（m）
	DurationS     float64           `json:"duration_s"`    // 推定所要時間（秒）
}

// intersectionOut は交差点のJSON出力形式．一時停止判定の結果を含む．
type intersectionOut struct {
	Index       int      `json:"index"`
	Lat         float64  `json:"lat"`
	Lng         float64  `json:"lng"`
	NumRoads    int      `json:"num_roads"`     // 合流する道路数
	Stopped     bool     `json:"stopped"`       // 一時停止したか
	MinSpeedKmh *float64 `json:"min_speed_kmh"` // 圏内の最小速度．未通過時は null
}

// intersectionsSummaryOut は交差点一覧のサマリー出力形式．
type intersectionsSummaryOut struct {
	Total   int               `json:"total"`   // 交差点の総数
	Stopped int               `json:"stopped"` // 一時停止した交差点数
	Results []intersectionOut `json:"results"`
}

// --- ハンドラー ---

// TripHandler はトリップ関連のHTTPエンドポイントを処理する．
type TripHandler struct {
	tripRepo     domain.TripRepository  // トリップの読み書き
	routeRepo    domain.RouteRepository // レスポンスにルート情報を含めるために参照
	routeUseCase domain.RoutePlanner    // ルート計画の実行
}

func NewTripHandler(tripRepo domain.TripRepository, routeRepo domain.RouteRepository, routeUC domain.RoutePlanner) *TripHandler {
	return &TripHandler{tripRepo: tripRepo, routeRepo: routeRepo, routeUseCase: routeUC}
}

// RegisterRoutes はchi ルーターにトリップ関連のルートを登録する．
func (h *TripHandler) RegisterRoutes(r chi.Router) {
	r.Route("/api/trips", func(r chi.Router) {
		r.Post("/", h.CreateTrip)
		r.Get("/", h.ListTrips)
		r.Get("/{tripID}", h.GetTrip)
		r.Post("/{tripID}/route", h.PlanRoute)
		r.Patch("/{tripID}/end", h.EndTrip)
		r.Get("/{tripID}/intersections", h.GetIntersections)
	})
}

// CreateTrip は新規トリップを作成する．UUID v4 を自動採番する．
func (h *TripHandler) CreateTrip(w http.ResponseWriter, r *http.Request) {
	var req tripCreateRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	trip := &domain.Trip{
		ID:             uuid.New().String(),
		StartedAt:      time.Now().UTC().Format(time.RFC3339),
		DestinationLat: req.DestinationLat,
		DestinationLng: req.DestinationLng,
	}
	if err := h.tripRepo.Save(trip); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, h.toOut(trip))
}

// PlanRoute は出発地→目的地の自転車ルートを計画する．
// OSRM でルートを取得し，交差点を抽出して保存する．
func (h *TripHandler) PlanRoute(w http.ResponseWriter, r *http.Request) {
	tripID := chi.URLParam(r, "tripID")

	var req routeRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	trip, err := h.tripRepo.Get(tripID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if trip == nil {
		writeError(w, http.StatusNotFound, "Trip not found")
		return
	}
	if trip.DestinationLat == nil || trip.DestinationLng == nil {
		writeError(w, http.StatusBadRequest, "Trip has no destination set")
		return
	}

	origin := domain.LatLng{Lat: req.OriginLat, Lng: req.OriginLng}
	dest := domain.LatLng{Lat: *trip.DestinationLat, Lng: *trip.DestinationLng}

	_, err = h.routeUseCase.Plan(r.Context(), tripID, origin, dest)
	if err != nil {
		// OsrmRoutingError の場合は 502 Bad Gateway を返す
		var osrmErr *domain.OsrmRoutingError
		if errors.As(err, &osrmErr) {
			writeError(w, http.StatusBadGateway, osrmErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	route := h.routeOut(trip.ID)
	if route == nil {
		writeError(w, http.StatusInternalServerError, "route was not saved")
		return
	}

	writeJSON(w, http.StatusOK, routePlanOut{
		ID:    trip.ID,
		Route: *route,
	})
}

// EndTrip はトリップを終了する．ended_at を記録し，任意で走行距離を保存する．
func (h *TripHandler) EndTrip(w http.ResponseWriter, r *http.Request) {
	tripID := chi.URLParam(r, "tripID")

	trip, err := h.tripRepo.Get(tripID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if trip == nil {
		writeError(w, http.StatusNotFound, "Trip not found")
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	trip.EndedAt = &now

	// リクエストボディがあれば走行距離を記録
	var req tripEndRequest
	if readJSON(r, &req) == nil && req.DistanceM != nil {
		trip.DistanceM = *req.DistanceM
	}

	if err := h.tripRepo.Save(trip); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, h.toOut(trip))
}

// GetTrip は指定IDのトリップ詳細を取得する．
func (h *TripHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	tripID := chi.URLParam(r, "tripID")
	trip, err := h.tripRepo.Get(tripID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if trip == nil {
		writeError(w, http.StatusNotFound, "Trip not found")
		return
	}
	writeJSON(w, http.StatusOK, h.toOut(trip))
}

// ListTrips は全トリップを一覧取得する（開始日時の降順）．
func (h *TripHandler) ListTrips(w http.ResponseWriter, r *http.Request) {
	trips, err := h.tripRepo.ListAll()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]tripOut, len(trips))
	for i, t := range trips {
		out[i] = h.toOut(t)
	}
	writeJSON(w, http.StatusOK, out)
}

// GetIntersections はトリップの交差点判定結果をサマリー形式で返す．
func (h *TripHandler) GetIntersections(w http.ResponseWriter, r *http.Request) {
	tripID := chi.URLParam(r, "tripID")
	trip, err := h.tripRepo.Get(tripID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if trip == nil {
		writeError(w, http.StatusNotFound, "Trip not found")
		return
	}

	results, err := h.routeRepo.GetIntersectionResults(tripID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	stoppedCount := 0
	ixOuts := make([]intersectionOut, len(results))
	for i, res := range results {
		if res.Stopped {
			stoppedCount++
		}
		ixOuts[i] = intersectionOut{
			Index:       res.Intersection.Index,
			Lat:         res.Intersection.Lat,
			Lng:         res.Intersection.Lng,
			NumRoads:    res.Intersection.NumRoads,
			Stopped:     res.Stopped,
			MinSpeedKmh: res.MinSpeedKmh,
		}
	}
	writeJSON(w, http.StatusOK, intersectionsSummaryOut{
		Total:   len(results),
		Stopped: stoppedCount,
		Results: ixOuts,
	})
}

// --- ヘルパー ---

// toOut はドメインモデルをJSON出力形式に変換する．ルート情報があれば含める．
func (h *TripHandler) toOut(trip *domain.Trip) tripOut {
	return tripOut{
		ID:             trip.ID,
		StartedAt:      trip.StartedAt,
		EndedAt:        trip.EndedAt,
		DistanceM:      trip.DistanceM,
		DestinationLat: trip.DestinationLat,
		DestinationLng: trip.DestinationLng,
		Route:          h.routeOut(trip.ID),
	}
}

// routeOut はルート情報をJSON出力形式に変換する．ルート未設定時は nil を返す．
// 交差点リストは intersectionResults をベースに構築する（リルート時の旧通過済み交差点を含むため）．
func (h *TripHandler) routeOut(tripID string) *routeOut {
	route, err := h.routeRepo.GetRoute(tripID)
	if err != nil || route == nil {
		return nil
	}
	results, err := h.routeRepo.GetIntersectionResults(tripID)
	if err != nil {
		return nil
	}

	// ジオメトリを [[lat, lng], ...] 形式に変換
	geometry := make([][]float64, len(route.Geometry))
	for i, ll := range route.Geometry {
		geometry[i] = []float64{ll.Lat, ll.Lng}
	}

	// 交差点リストは intersectionResults から構築する
	// （リルート後は旧ルートの通過済み交差点 + 新ルートの交差点が含まれる）
	ixOuts := make([]intersectionOut, len(results))
	for i, r := range results {
		ixOuts[i] = intersectionOut{
			Index:       r.Intersection.Index,
			Lat:         r.Intersection.Lat,
			Lng:         r.Intersection.Lng,
			NumRoads:    r.Intersection.NumRoads,
			Stopped:     r.Stopped,
			MinSpeedKmh: r.MinSpeedKmh,
		}
	}

	return &routeOut{
		Geometry:      geometry,
		Intersections: ixOuts,
		DistanceM:     route.DistanceM,
		DurationS:     route.DurationS,
	}
}
