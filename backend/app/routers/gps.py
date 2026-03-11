"""GPS batch receive + stop-sign violation detection."""

from uuid import uuid4

from fastapi import APIRouter, Request

from app.models.schemas import GpsBatchRequest, GpsBatchResponse, ViolationOut
from app.services.gps_analysis import check_stop_violations
from app.store import GpsPoint, Violation, store

router = APIRouter(prefix="/api", tags=["gps"])


@router.post("/gps", response_model=GpsBatchResponse)
async def receive_gps(body: GpsBatchRequest, request: Request) -> GpsBatchResponse:
    settings = request.app.state.settings
    cache = request.app.state.overpass_cache

    # Filter low-accuracy points
    valid = [p for p in body.points if p.accuracy_m <= 20]

    # Store points
    gps_list = store.gps_points.setdefault(body.trip_id, [])
    for p in valid:
        gps_list.append(
            GpsPoint(
                trip_id=body.trip_id,
                lat=p.lat,
                lng=p.lng,
                speed_kmh=p.speed_kmh,
                accuracy_m=p.accuracy_m,
                recorded_at=p.recorded_at,
            )
        )

    # Check for stop-sign violations
    violations = await check_stop_violations(
        valid,
        cache,
        radius_m=settings.stop_sign_radius_m,
        speed_threshold=settings.stop_sign_speed_threshold,
    )

    # Store violations
    for v in violations:
        store.violations.setdefault(body.trip_id, []).append(
            Violation(
                id=str(uuid4()),
                trip_id=body.trip_id,
                type=v["type"],
                detected_at=v["detected_at"],
                lat=v["lat"],
                lng=v["lng"],
            )
        )

    return GpsBatchResponse(
        saved=len(valid),
        violations=[ViolationOut(**v) for v in violations],
    )
