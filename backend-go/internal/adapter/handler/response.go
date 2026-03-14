package handler

import (
	"encoding/json"
	"net/http"
)

// writeJSON は値をJSONにシリアライズしてレスポンスに書き込む．
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError はエラーメッセージを {"detail": "..."} 形式でレスポンスに書き込む．
// FastAPI のエラーレスポンス形式に合わせている．
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"detail": message})
}

// readJSON はリクエストボディをJSONとしてデコードする．
// Go の net/http がハンドラー終了後に Body を自動で閉じるため，明示的な Close は不要．
func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
