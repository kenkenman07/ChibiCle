// BlueTicketDriving バックエンドサーバーのエントリーポイント．
// Clean Architecture の合成ルート（Composition Root）として，
// 全ての具体的な実装をインスタンス化し，依存関係を注入してサーバーを起動する．
package main

import (
	"btd/internal/adapter"
	"btd/internal/adapter/handler"
	"btd/internal/config"
	"btd/internal/usecase"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	// 環境変数から設定を読み込み（プレフィックス: BTD_）
	settings, err := config.Load()
	if err != nil {
		slog.Error("設定の読み込みに失敗", "error", err)
		os.Exit(1)
	}

	// 共有HTTPクライアント（外部API呼び出し用）
	// コネクションプールを明示的に設定し，User-Agent を自動付与する
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     30 * time.Second,
	}
	httpClient := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &adapter.RoundTripperWithUA{
			Base: transport,
			UA:   "BlueTicketDriving/1.0 (bicycle-safety-pwa)",
		},
	}

	// アダプター層: インターフェースの具体的な実装を生成
	repo := adapter.NewInMemoryRepository() // 全リポジトリのインメモリ実装
	osrm := adapter.NewOsrmGateway(         // OSRM + Overpass（ルーティング + 公道/信号判定）
		settings.OsrmBaseURL,
		settings.OsrmProfile,
		settings.IntersectionMinRoads,
		settings.FilterNonPublicRoads,
		settings.FilterSignalizedIntersections,
		settings.OverpassAPIURL,
		httpClient,
	)
	photon := adapter.NewPhotonGateway(settings.PhotonBaseURL, httpClient) // Photon（ジオコーディング）

	// ユースケース層: ビジネスロジックを組み立て
	routeUC := usecase.NewRoutePlanningUseCase(osrm, repo)
	gpsUC := usecase.NewGpsAnalysisUseCase(
		repo, repo, repo, osrm, // repo は3つのリポジトリインターフェースを全て実装
		settings.IntersectionRadiusM,
		settings.IntersectionSpeedThreshold,
		settings.OffRouteThresholdM,
		settings.GpsAccuracyThresholdM,
	)

	// ハンドラー層: HTTPエンドポイントの処理を担当
	tripHandler := handler.NewTripHandler(repo, repo, routeUC)
	gpsHandler := handler.NewGpsHandler(gpsUC)
	geocodeHandler := handler.NewGeocodeHandler(photon)

	// ルーター構築
	r := chi.NewRouter()

	// CORS ミドルウェア
	corsOpts := cors.Options{
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	}
	if settings.CorsAllowAll {
		corsOpts.AllowOriginFunc = func(r *http.Request, origin string) bool { return true }
	} else {
		corsOpts.AllowedOrigins = settings.CorsOrigins
	}
	r.Use(cors.Handler(corsOpts))
	r.Use(handler.RequestLogger) // 全リクエストのログ記録

	// エンドポイント登録
	tripHandler.RegisterRoutes(r)    // /api/trips/*
	gpsHandler.RegisterRoutes(r)     // /api/gps
	geocodeHandler.RegisterRoutes(r) // /api/geocode

	// ヘルスチェックエンドポイント
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// サーバー起動
	addr := fmt.Sprintf(":%d", settings.Port)
	srv := &http.Server{Addr: addr, Handler: r}

	slog.Info("サーバー起動", "addr", addr)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("サーバーエラー", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful Shutdown: SIGINT/SIGTERM を受信したら5秒以内に処理を完了して終了
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("シャットダウン中...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
