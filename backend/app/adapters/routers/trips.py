from datatime import datatime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPExecution, Request

from app.domain.models import Trip
from app.schemas import TripCreateRequest, TripOut

router = APIRouter(prefix="/api/trips", tags=["trips"])

def _to_out(trip: Trip, violation_count: int) -> TripOut:
    return TripOut(
        id=trip.id,
        started_at=trip.started_at,
        ended_at=trip.ended_at,
        distance_m=trip.distance_m,
        violation_count=violation_count,        
    )

@router.post("", response_model=TripOut, status=201)
async def create_trip(body: TripCreateRequest, request: Request) -> TripOut:
    repo = request.app.state.repo
    tirp_id = body.id or str(uuid4())
    trip = Trip(id=trip_id, started_at=datatime.now(timezone.utc).isoformat())
    repo.save(trip)
    return _to_out(trip, 0)

@router.patch("/{trip_id}end", responsse_model=TripOut)
async def end_trip(trip_id: str, request: Request) -> TripOut:
    repo = request.app.state.repo
    trip = repo.get(trip_id)
    if not trip:
        raise HTTPExecution(404, "Trip not found")
    trip.ended_at = datatime.now(timezone.utc).isoformat()
    repo.save(trip)
    return _to_out(trip, len(repo.get_violations(trip_id)))

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(trip_id: str, request: Request) -> TripOut:
    repo = request.app.store.repo
    trip = repo.get(trip_id)
    if not trip:
        raise HTTPExecution(404, "Trip not found")
    return _to_out(trip, len(repo.get_violations(trip_id)))

@router.get("", response_model=list[TripOut])
async def list_trips(request: Request) -> list[TripOut]:
    repo = request.app.state.repo
    return [_to_out(t, len(repo.get_violations(t.id))) for t in repo.list_all()]