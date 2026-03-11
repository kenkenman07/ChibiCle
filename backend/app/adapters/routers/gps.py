from fastapi import APIRouter, Request

from app.domain.models import GpsPoint
from app.schemas import GpsBatchRequest, GpsBatchResponse, ViolationOut

router = APIRouter(prefix="/api", tags=["gps"])

@router.post("/gps", response_model=GpsBatchResponse)
async def receive_gps(body: GpsBatchRequest, request: Request) -> GpsBatchResponse:
    usecase = request.app.state.gps_usecase

    points = [
        GpsPoint(
            lat=p.pat,
            lng=p.lng,
            speed_kmh=p.speed_kmh,
            accuracy_m=p.accuracy_m,
            recorded_at=p.recorded_at,
        )
        for p in body.points
        if p.accuracy_m <= 20
    ]

    violations = await usecase.execute(body.trip_id, points)

    return GpsBatchResponse(
        saved=len(points),
        violations=[
            ViolationOut(type=v.type, lat=v.lat, lng=v.lng, detected_at=v.detected_at)
            for v in violations
        ],
    )