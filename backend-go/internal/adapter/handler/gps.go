package handler

import (
	"btd/internal/domain"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// --- リクエスト型 ---

// gpsBatchRequest はGPSバッチ送信のリクエストボディ．
// フロントエンドから5秒間隔で送信される．
type gpsBatchRequest struct {
	TripID string       `json:"trip_id"` // 対象トリップのID
	Points []gpsPointIn `json:"points"`  // バッファされたGPSポイント列
}

// gpsPointIn は1件のGPSポイントの入力形式．
type gpsPointIn struct {
	Lat        float64  `json:"lat"`
	Lng        float64  `json:"lng"`
	SpeedKmh   *float64 `json:"speed_kmh"`   // null = 速度取得不可（停止とは区別する）
	AccuracyM  float64  `json:"accuracy_m"`
	RecordedAt string   `json:"recorded_at"`
}

// --- レスポンス型 ---

// gpsBatchResponse はGPSバッチ処理の結果．
type gpsBatchResponse struct {
	Saved               int                    `json:"saved"`                // 保存されたポイント数
	IntersectionUpdates []intersectionUpdateOut `json:"intersection_updates"` // 変化のあった交差点のみ
	Rerouted            bool                   `json:"rerouted"`             // 経路逸脱によるリルートが発生したか
}

// intersectionUpdateOut は各交差点の現在の判定状態．
type intersectionUpdateOut struct {
	Index       int      `json:"index"`
	Lat         float64  `json:"lat"`
	Lng         float64  `json:"lng"`
	NumRoads    int      `json:"num_roads"`
	Stopped     bool     `json:"stopped"`
	MinSpeedKmh *float64 `json:"min_speed_kmh"`
}

// --- ハンドラー ---

// GpsHandler はGPSデータ受信エンドポイントを処理する．
type GpsHandler struct {
	gpsUseCase domain.GpsAnalyzer // GPS分析ユースケース
}

func NewGpsHandler(uc domain.GpsAnalyzer) *GpsHandler {
	return &GpsHandler{gpsUseCase: uc}
}

func (h *GpsHandler) RegisterRoutes(r chi.Router) {
	r.Post("/api/gps", h.ReceiveGps)
}

// ReceiveGps はGPSポイントをバッチ受信し，一時停止判定・リルートを実行する．
// 変化のあった交差点（stopped または min_speed_kmh が更新された）のみ返却する．
func (h *GpsHandler) ReceiveGps(w http.ResponseWriter, r *http.Request) {
	var req gpsBatchRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// リクエスト型 → ドメインモデルに変換
	points := make([]domain.GpsPoint, 0, len(req.Points))
	for _, p := range req.Points {
		points = append(points, domain.GpsPoint{
			Lat:        p.Lat,
			Lng:        p.Lng,
			SpeedKmh:   p.SpeedKmh,
			AccuracyM:  p.AccuracyM,
			RecordedAt: p.RecordedAt,
		})
	}

	// ユースケースを実行（保存→リルート判定→一時停止判定）
	result, err := h.gpsUseCase.Execute(r.Context(), req.TripID, points)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 全交差点の現在の判定状態を返す（フロントが完全な状態を持てるようにする）
	updates := make([]intersectionUpdateOut, len(result.IntersectionResults))
	for i, res := range result.IntersectionResults {
		updates[i] = intersectionUpdateOut{
			Index:       res.Intersection.Index,
			Lat:         res.Intersection.Lat,
			Lng:         res.Intersection.Lng,
			NumRoads:    res.Intersection.NumRoads,
			Stopped:     res.Stopped,
			MinSpeedKmh: res.MinSpeedKmh,
		}
	}

	writeJSON(w, http.StatusOK, gpsBatchResponse{
		Saved:               result.Saved,
		IntersectionUpdates: updates,
		Rerouted:            result.Rerouted,
	})
}
