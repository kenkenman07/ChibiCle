package handler

import (
	"log/slog"
	"net/http"
	"time"
)

// statusWriter は ResponseWriter をラップしてステータスコードを記録する．
// RequestLogger がレスポンスのステータスコードをログに含めるために使用する．
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// RequestLogger は全リクエストのメソッド・パス・ステータス・処理時間をログに記録するミドルウェア．
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		t0 := time.Now()
		slog.Info(">>>", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(sw, r)
		slog.Info("<<<", "method", r.Method, "path", r.URL.Path, "status", sw.status, "duration", time.Since(t0).String())
	})
}
