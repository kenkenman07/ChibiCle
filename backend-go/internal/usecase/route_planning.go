// usecase パッケージはアプリケーションのビジネスロジックを実装する．
// domain 層のインターフェースのみに依存し，具体的なインフラ実装を知らない．
package usecase

import (
	"btd/internal/domain"
	"context"
)

// RoutePlanningUseCase は出発地→目的地の自転車ルートを計画するユースケース．
// OSRM でルートを取得し，交差点判定の初期結果とともにリポジトリに保存する．
type RoutePlanningUseCase struct {
	routingService domain.RoutingService  // OSRM ルーティング
	repo           domain.RouteRepository // ルート・交差点結果の永続化
}

func NewRoutePlanningUseCase(rs domain.RoutingService, repo domain.RouteRepository) *RoutePlanningUseCase {
	return &RoutePlanningUseCase{routingService: rs, repo: repo}
}

// Plan はルートを取得し，全交差点の判定結果を Stopped=false で初期化して保存する．
func (uc *RoutePlanningUseCase) Plan(ctx context.Context, tripID string, origin, destination domain.LatLng) (*domain.Route, error) {
	// OSRM で自転車ルートを取得
	route, err := uc.routingService.GetBicycleRoute(ctx, origin, destination)
	if err != nil {
		return nil, err
	}

	// 全交差点に対して判定結果を初期化（Stopped=false, MinSpeedKmh=nil）
	results := make([]*domain.IntersectionResult, len(route.Intersections))
	for i, ix := range route.Intersections {
		results[i] = &domain.IntersectionResult{Intersection: ix}
	}

	// ルートと判定結果をリポジトリに保存
	if err := uc.repo.SaveRoute(tripID, route); err != nil {
		return nil, err
	}
	if err := uc.repo.SaveIntersectionResults(tripID, results); err != nil {
		return nil, err
	}
	return route, nil
}
