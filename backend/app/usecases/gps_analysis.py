"""ユースケース: GPSバッチ分析 — 交差点での一時停止判定とリルート処理。"""

from geopy.distance import geodesic

from app.domain.models import GpsPoint, IntersectionResult, Route
from app.domain.ports import GpsRepository, RouteRepository, RoutingService, TripRepository


class GpsAnalysisResult:
    __slots__ = ("saved", "intersection_results", "rerouted")

    def __init__(
        self,
        saved: int,
        intersection_results: list[IntersectionResult],
        rerouted: bool = False,
    ) -> None:
        self.saved = saved
        self.intersection_results = intersection_results
        self.rerouted = rerouted


class GpsAnalysisUseCase:
    def __init__(
        self,
        gps_repo: GpsRepository,
        route_repo: RouteRepository,
        trip_repo: TripRepository,
        routing_service: RoutingService,
        radius_m: float = 15.0,
        speed_threshold: float = 3.0,
        off_route_threshold_m: float = 50.0,
    ) -> None:
        self._gps_repo = gps_repo
        self._route_repo = route_repo
        self._trip_repo = trip_repo
        self._routing_service = routing_service
        self._radius_m = radius_m
        self._speed_threshold = speed_threshold
        self._off_route_threshold_m = off_route_threshold_m

    async def execute(
        self, trip_id: str, points: list[GpsPoint],
    ) -> GpsAnalysisResult:
        self._gps_repo.append_points(trip_id, points)

        rerouted = False
        route = self._route_repo.get_route(trip_id)

        # 経路逸脱時にリルート
        if route and points:
            last_point = points[-1]
            if self._is_off_route(last_point, route):
                trip = self._trip_repo.get(trip_id)
                destination = None
                if trip and trip.destination_lat is not None and trip.destination_lng is not None:
                    destination = (trip.destination_lat, trip.destination_lng)
                if destination:
                    new_route = await self._routing_service.get_bicycle_route(
                        (last_point.lat, last_point.lng), destination,
                    )
                    new_results = [
                        IntersectionResult(intersection=ix)
                        for ix in new_route.intersections
                    ]
                    self._route_repo.save_route(trip_id, new_route)
                    self._route_repo.save_intersection_results(trip_id, new_results)
                    route = new_route
                    rerouted = True

        # 交差点での一時停止を判定
        results = self._route_repo.get_intersection_results(trip_id)
        for point in points:
            if point.accuracy_m > 20:
                continue
            for result in results:
                if result.stopped:
                    continue
                dist = geodesic(
                    (point.lat, point.lng),
                    (result.intersection.lat, result.intersection.lng),
                ).meters
                if dist <= self._radius_m:
                    if result.min_speed_kmh is None or point.speed_kmh < result.min_speed_kmh:
                        result.min_speed_kmh = point.speed_kmh
                    if point.speed_kmh < self._speed_threshold:
                        result.stopped = True

        self._route_repo.save_intersection_results(trip_id, results)

        return GpsAnalysisResult(
            saved=len(points),
            intersection_results=results,
            rerouted=rerouted,
        )

    def _is_off_route(self, point: GpsPoint, route: Route) -> bool:
        """ポイントがルートジオメトリのいずれかのセグメントから離れすぎていないか判定。"""
        min_dist = float("inf")
        for lat, lng in route.geometry:
            dist = geodesic((point.lat, point.lng), (lat, lng)).meters
            if dist < min_dist:
                min_dist = dist
            if min_dist <= self._off_route_threshold_m:
                return False
        return min_dist > self._off_route_threshold_m
