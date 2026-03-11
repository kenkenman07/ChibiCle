"""Trip CRUD endpoints (in-memory storage for MVP)."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import TripCreateRequest, TripOut
from app.store import Trip, store

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _trip_out(trip: Trip) -> TripOut:
    violations = store.violations.get(trip.id, [])
    return TripOut(
        id=trip.id,
        started_at=trip.started_at,
        ended_at=trip.ended_at,
        distance_m=trip.distance_m,
        violation_count=len(violations),
    )


@router.post("", response_model=TripOut, status_code=201)
async def create_trip(body: TripCreateRequest) -> TripOut:
    trip_id = body.id or str(uuid4())
    trip = Trip(
        id=trip_id,
        started_at=datetime.now(timezone.utc).isoformat(),
    )
    store.trips[trip_id] = trip
    store.gps_points[trip_id] = []
    store.violations[trip_id] = []
    return _trip_out(trip)


@router.patch("/{trip_id}/end", response_model=TripOut)
async def end_trip(trip_id: str) -> TripOut:
    trip = store.trips.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    trip.ended_at = datetime.now(timezone.utc).isoformat()
    return _trip_out(trip)


@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(trip_id: str) -> TripOut:
    trip = store.trips.get(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    return _trip_out(trip)


@router.get("", response_model=list[TripOut])
async def list_trips() -> list[TripOut]:
    return [_trip_out(t) for t in store.trips.values()]
