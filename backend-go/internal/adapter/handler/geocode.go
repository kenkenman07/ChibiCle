package handler

import (
	"btd/internal/domain"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// geocodeResultOut はジオコーディング結果のJSON出力形式．
type geocodeResultOut struct {
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	DisplayName string  `json:"display_name"`
}

// GeocodeHandler は地名検索エンドポイントを処理する．
type GeocodeHandler struct {
	service domain.GeocodingService // ジオコーディングサービス
}

func NewGeocodeHandler(service domain.GeocodingService) *GeocodeHandler {
	return &GeocodeHandler{service: service}
}

func (h *GeocodeHandler) RegisterRoutes(r chi.Router) {
	r.Get("/api/geocode", h.Geocode)
}

// Geocode はクエリ文字列で地名を検索し，座標と表示名のリストを返す．
// エラー時はユーザー体験を損なわないよう空配列を返す．
func (h *GeocodeHandler) Geocode(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		writeError(w, http.StatusBadRequest, "query must be at least 2 characters")
		return
	}

	// limit パラメータの解析（デフォルト5，範囲1〜10）
	limit := 5
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v >= 1 && v <= 10 {
			limit = v
		}
	}

	results, err := h.service.Search(r.Context(), q, limit)
	if err != nil {
		writeJSON(w, http.StatusOK, []geocodeResultOut{}) // エラーでも空配列を返す
		return
	}

	// ドメインモデル → JSON出力形式に変換
	out := make([]geocodeResultOut, len(results))
	for i, res := range results {
		out[i] = geocodeResultOut{
			Lat:         res.Lat,
			Lng:         res.Lng,
			DisplayName: res.DisplayName,
		}
	}
	writeJSON(w, http.StatusOK, out)
}
