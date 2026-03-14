"""トリップCRUDエンドポイント — リポジトリ上の薄いアダプター。"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from app.adapters.memory_repo import InMemoryRepository
from app.domain.models import Trip
from app.schemas import (
    IntersectionOut,
    IntersectionsSummaryOut,
    RouteOut,
    TripCreateRequest,
    TripOut,
)

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _route_out(repo: InMemoryRepository, trip_id: str) -> RouteOut | None:
    route = repo.get_route(trip_id)
    if route is None:
        return None
    results = repo.get_intersection_results(trip_id)
    result_map = {r.intersection.index: r for r in results}
    return RouteOut(
        geometry=[[lat, lng] for lat, lng in route.geometry],
        intersections=[
            IntersectionOut(
                index=ix.index,
                lat=ix.lat,
                lng=ix.lng,
                num_roads=ix.num_roads,
                stopped=result_map[ix.index].stopped if ix.index in result_map else False,
                min_speed_kmh=result_map[ix.index].min_speed_kmh if ix.index in result_map else None,
            )
            for ix in route.intersections
        ],
        distance_m=route.distance_m,
        duration_s=route.duration_s,
    )


def _to_out(trip: Trip, repo: InMemoryRepository) -> TripOut:
    return TripOut(
        id=trip.id,
        started_at=trip.started_at,
        ended_at=trip.ended_at,
        distance_m=trip.distance_m,
        destination_lat=trip.destination_lat,
        destination_lng=trip.destination_lng,
        route=_route_out(repo, trip.id),
    )


@router.post("", response_model=TripOut, status_code=201)
async def create_trip(body: TripCreateRequest, request: Request) -> TripOut:
    repo = request.app.state.repo
    trip_id = body.id or str(uuid4())
    trip = Trip(
        id=trip_id,
        started_at=datetime.now(timezone.utc).isoformat(),
        destination_lat=body.destination_lat,
        destination_lng=body.destination_lng,
    )
    repo.save(trip)

    return _to_out(trip, repo)


@router.post("/{trip_id}/route", response_model=TripOut)
async def plan_route(
    trip_id: str,
    request: Request,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
) -> TripOut:
    """トリップ作成後、ユーザーのGPS位置情報を取得してからルートを計画。"""
    from app.adapters.osrm_gateway import OsrmRoutingError

    repo = request.app.state.repo
    route_usecase = request.app.state.route_usecase

    trip = repo.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    if trip.destination_lat is None or trip.destination_lng is None:
        raise HTTPException(400, "Trip has no destination set")
    if origin_lat is None or origin_lng is None:
        raise HTTPException(400, "Origin coordinates required")

    try:
        await route_usecase.plan(
            trip_id=trip_id,
            origin=(origin_lat, origin_lng),
            destination=(trip.destination_lat, trip.destination_lng),
        )
    except OsrmRoutingError as e:
        raise HTTPException(502, str(e))

    return _to_out(trip, repo)


@router.patch("/{trip_id}/end", response_model=TripOut)
async def end_trip(trip_id: str, request: Request) -> TripOut:
    repo = request.app.state.repo
    trip = repo.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    trip.ended_at = datetime.now(timezone.utc).isoformat()
    repo.save(trip)
    return _to_out(trip, repo)


@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(trip_id: str, request: Request) -> TripOut:
    repo = request.app.state.repo
    trip = repo.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    return _to_out(trip, repo)


@router.get("", response_model=list[TripOut])
async def list_trips(request: Request) -> list[TripOut]:
    repo = request.app.state.repo
    return [_to_out(t, repo) for t in repo.list_all()]


@router.get("/{trip_id}/intersections", response_model=IntersectionsSummaryOut)
async def get_intersections(trip_id: str, request: Request) -> IntersectionsSummaryOut:
    repo = request.app.state.repo
    trip = repo.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")

    results = repo.get_intersection_results(trip_id)
    return IntersectionsSummaryOut(
        total=len(results),
        stopped=sum(1 for r in results if r.stopped),
        results=[
            IntersectionOut(
                index=r.intersection.index,
                lat=r.intersection.lat,
                lng=r.intersection.lng,
                num_roads=r.intersection.num_roads,
                stopped=r.stopped,
                min_speed_kmh=r.min_speed_kmh,
            )
            for r in results
        ],
    )
