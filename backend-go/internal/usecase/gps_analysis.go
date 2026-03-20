package usecase

import (
	"btd/internal/domain"
	"context"
	"log/slog"
	"time"
)

// GpsAnalysisUseCase はGPSバッチデータを受信し，交差点での一時停止判定と経路逸脱検知を行うユースケース．
// フロントエンドから5秒間隔で送信されるGPSポイントを処理する．
type GpsAnalysisUseCase struct {
	gpsRepo            domain.GpsRepository   // GPSポイントの永続化
	routeRepo          domain.RouteRepository // ルート・交差点結果の読み書き
	tripRepo           domain.TripRepository  // 目的地の取得（リルート時に必要）
	routingService     domain.RoutingService  // 再ルーティング（経路逸脱時）
	radiusM            float64                // 交差点圏内と判定する半径（m）
	speedThreshold     float64                // 一時停止と判定する速度閾値（km/h）
	offRouteThresholdM float64                // 経路逸脱と判定する距離（m）
	accuracyThresholdM float64                // GPS精度フィルタ閾値（m）．これを超えるポイントは無視
}

func NewGpsAnalysisUseCase(
	gpsRepo domain.GpsRepository,
	routeRepo domain.RouteRepository,
	tripRepo domain.TripRepository,
	routingService domain.RoutingService,
	radiusM, speedThreshold, offRouteThresholdM, accuracyThresholdM float64,
) *GpsAnalysisUseCase {
	return &GpsAnalysisUseCase{
		gpsRepo:            gpsRepo,
		routeRepo:          routeRepo,
		tripRepo:           tripRepo,
		routingService:     routingService,
		radiusM:            radiusM,
		speedThreshold:     speedThreshold,
		offRouteThresholdM: offRouteThresholdM,
		accuracyThresholdM: accuracyThresholdM,
	}
}

// Execute はGPSポイントを保存し，経路逸脱チェック→一時停止判定を実行する．
// 処理結果として保存件数，交差点判定結果，リルート有無を返す．
func (uc *GpsAnalysisUseCase) Execute(ctx context.Context, tripID string, points []domain.GpsPoint) (*domain.GpsAnalysisResult, error) {
	tTotal := time.Now()

	if err := uc.gpsRepo.AppendPoints(tripID, points); err != nil {
		return nil, err
	}

	rerouted := false
	route, err := uc.routeRepo.GetRoute(tripID)
	if err != nil {
		return nil, err
	}

	if route != nil && len(points) > 0 {
		lastPoint := points[len(points)-1]
		if uc.isOffRoute(lastPoint, route) {
			trip, err := uc.tripRepo.Get(tripID)
			if err != nil {
				return nil, err
			}
			if trip != nil && trip.DestinationLat != nil && trip.DestinationLng != nil {
				dest := domain.LatLng{Lat: *trip.DestinationLat, Lng: *trip.DestinationLng}
				origin := domain.LatLng{Lat: lastPoint.Lat, Lng: lastPoint.Lng}

				// リルート前の交差点結果を取得し，通過済みのものを保持する
				oldResults, err := uc.routeRepo.GetIntersectionResults(tripID)
				if err != nil {
					return nil, err
				}
				var pastEncountered []*domain.IntersectionResult
				for _, r := range oldResults {
					if r.Stopped || r.MinSpeedKmh != nil {
						pastEncountered = append(pastEncountered, r)
					}
				}

				// 現在位置→目的地で新ルートを取得
				newRoute, err := uc.routingService.GetBicycleRoute(ctx, origin, dest)
				if err != nil {
					return nil, err
				}
				// 新ルートの交差点結果を初期化
				newResults := make([]*domain.IntersectionResult, len(newRoute.Intersections))
				for i, ix := range newRoute.Intersections {
					newResults[i] = &domain.IntersectionResult{Intersection: ix}
				}

				// 旧ルートの通過済み交差点 + 新ルートの交差点を結合し，indexを振り直す
				combined := make([]*domain.IntersectionResult, 0, len(pastEncountered)+len(newResults))
				combined = append(combined, pastEncountered...)
				combined = append(combined, newResults...)
				for i, r := range combined {
					r.Intersection.Index = i
				}

				if err := uc.routeRepo.SaveRoute(tripID, newRoute); err != nil {
					return nil, err
				}
				if err := uc.routeRepo.SaveIntersectionResults(tripID, combined); err != nil {
					return nil, err
				}
				rerouted = true
			}
		}
	}

	tStopDetect := time.Now()
	results, err := uc.routeRepo.GetIntersectionResults(tripID)
	if err != nil {
		return nil, err
	}

	// 速度ポインタ用のバッファを事前確保（ループ内のヒープアロケーションを回避）
	speedBuf := make([]float64, len(results))
	for i, r := range results {
		if r.MinSpeedKmh != nil {
			speedBuf[i] = *r.MinSpeedKmh
		} else {
			speedBuf[i] = -1 // 未設定を示すセンチネル値
		}
	}

	// 全GPSポイント × 全交差点 で判定
	for _, point := range points {
		// GPS精度が低いポイントはスキップ
		if point.AccuracyM > uc.accuracyThresholdM {
			continue
		}
		// 速度が取得できなかったポイントは停止判定に使用しない
		if point.SpeedKmh == nil {
			continue
		}
		speed := *point.SpeedKmh
		for i, result := range results {
			// 既に停止判定済みの交差点はスキップ
			if result.Stopped {
				continue
			}
			// Haversine距離で交差点圏内かを判定
			dist := domain.DistanceM(point.Lat, point.Lng, result.Intersection.Lat, result.Intersection.Lng)
			if dist <= uc.radiusM {
				// 圏内の最小速度を更新
				if speedBuf[i] < 0 || speed < speedBuf[i] {
					speedBuf[i] = speed
					result.MinSpeedKmh = &speedBuf[i]
				}
				// 速度が閾値未満なら一時停止と判定
				if speed < uc.speedThreshold {
					result.Stopped = true
				}
			}
		}
	}

	if err := uc.routeRepo.SaveIntersectionResults(tripID, results); err != nil {
		return nil, err
	}

	slog.Info("GpsAnalysis",
		"total_s", time.Since(tTotal).Seconds(),
		"stop_detect_s", time.Since(tStopDetect).Seconds(),
		"points", len(points),
		"intersections", len(results),
		"rerouted", rerouted,
	)

	return &domain.GpsAnalysisResult{
		Saved:               len(points),
		IntersectionResults: results,
		Rerouted:            rerouted,
	}, nil
}

// isOffRoute は指定GPSポイントがルートから逸脱しているかを判定する．
// ルートジオメトリの全頂点との最小距離が閾値を超えていれば true を返す．
// 閾値以内の頂点が見つかった時点で早期リターンする．
func (uc *GpsAnalysisUseCase) isOffRoute(point domain.GpsPoint, route *domain.Route) bool {
	minDist := float64(1e18)
	for _, ll := range route.Geometry {
		dist := domain.DistanceM(point.Lat, point.Lng, ll.Lat, ll.Lng)
		if dist < minDist {
			minDist = dist
		}
		if minDist <= uc.offRouteThresholdM {
			return false // 経路上にいる
		}
	}
	return minDist > uc.offRouteThresholdM
}
