"""GPSバッチエンドポイント — GpsAnalysisUseCase上の薄いアダプター。"""

from fastapi import APIRouter, Request

from app.domain.models import GpsPoint
from app.schemas import GpsBatchRequest, GpsBatchResponse, IntersectionUpdateOut

router = APIRouter(prefix="/api", tags=["gps"])


@router.post("/gps", response_model=GpsBatchResponse)
async def receive_gps(body: GpsBatchRequest, request: Request) -> GpsBatchResponse:
    usecase = request.app.state.gps_usecase

    points = [
        GpsPoint(
            lat=p.lat,
            lng=p.lng,
            speed_kmh=p.speed_kmh,
            accuracy_m=p.accuracy_m,
            recorded_at=p.recorded_at,
        )
        for p in body.points
        if p.accuracy_m <= 20
    ]

    result = await usecase.execute(body.trip_id, points)

    return GpsBatchResponse(
        saved=result.saved,
        intersection_updates=[
            IntersectionUpdateOut(
                index=r.intersection.index,
                stopped=r.stopped,
                min_speed_kmh=r.min_speed_kmh,
            )
            for r in result.intersection_results
            if r.stopped or r.min_speed_kmh is not None
        ],
        rerouted=result.rerouted,
    )
