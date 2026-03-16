"""ユースケース: 自転車ルートの計画と交差点トラッキングの初期化。"""

from app.domain.models import IntersectionResult, Route
from app.domain.ports import RouteRepository, RoutingService


class RoutePlanningUseCase:
    def __init__(
        self,
        routing_service: RoutingService,
        repo: RouteRepository,
    ) -> None:
        self._routing_service = routing_service
        self._repo = repo

    async def plan(
        self,
        trip_id: str,
        origin: tuple[float, float],
        destination: tuple[float, float],
    ) -> Route:
        route = await self._routing_service.get_bicycle_route(origin, destination)
        results = [
            IntersectionResult(intersection=ix)
            for ix in route.intersections
        ]
        self._repo.save_route(trip_id, route)
        self._repo.save_intersection_results(trip_id, results)
        return route
