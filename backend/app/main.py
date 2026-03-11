"""FastAPI application — Clean Architecture DI wiring."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

from app.adapters.memory_repo import InMemoryRepository
from app.adapters.overpass_gateway import OverpassGateway
from app.adapters.routers import camera, gps, trips
from app.adapters.yolo_gateway import YoloGateway
from app.config import Settings
from app.domain.detectors import RedSignalDetector, RightSideDetector, StopSignDetector
from app.usecases.frame_analysis import FrameAnalysisUseCase
from app.usecases.gps_analysis import GpsAnalysisUseCase

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # ---- Adapters (outermost layer) ----
    repo = InMemoryRepository()

    overpass = OverpassGateway(
        ttl_seconds=settings.overpass_cache_ttl_seconds,
        query_radius_m=settings.overpass_query_radius_m,
    )

    yolo_model = YOLO(settings.yolo_model)
    yolo = YoloGateway(yolo_model, confidence=settings.yolo_confidence)

    # ---- Domain detectors (Strategy pattern) ----
    gps_detectors = [
        StopSignDetector(
            source=overpass,
            radius_m=settings.stop_sign_radius_m,
            speed_threshold=settings.stop_sign_speed_threshold,
        ),
        RightSideDetector(
            source=overpass,
            window_size=settings.road_analysis_window,
            ratio=settings.road_wrong_side_ratio,
        ),
    ]

    frame_detectors = [
        RedSignalDetector(
            analyzer=yolo,
            speed_threshold=settings.red_signal_speed_threshold,
        ),
    ]

    # ---- Use cases (application layer) ----
    gps_usecase = GpsAnalysisUseCase(
        detectors=gps_detectors,
        gps_repo=repo,
        violation_repo=repo,
        cooldown_s=settings.road_violation_cooldown_s,
    )

    frame_usecase = FrameAnalysisUseCase(
        detectors=frame_detectors,
        violation_repo=repo,
    )

    # ---- Expose to routers via app.state ----
    app.state.settings = settings
    app.state.repo = repo
    app.state.gps_usecase = gps_usecase
    app.state.frame_usecase = frame_usecase

    yield


app = FastAPI(title="Blue Ticket Driving API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router)
app.include_router(gps.router)
app.include_router(camera.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
