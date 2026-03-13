"""FastAPIアプリケーション — クリーンアーキテクチャDI配線。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.memory_repo import InMemoryRepository
from app.adapters.osrm_gateway import OsrmGateway
from app.adapters.routers import gps, trips
from app.config import Settings
from app.usecases.gps_analysis import GpsAnalysisUseCase
from app.usecases.route_planning import RoutePlanningUseCase

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # ---- アダプター層（最外層） ----
    repo = InMemoryRepository()

    osrm = OsrmGateway(
        base_url=settings.osrm_base_url,
        min_roads=settings.intersection_min_roads,
    )

    # ---- ユースケース層（アプリケーション層） ----
    route_usecase = RoutePlanningUseCase(
        routing_service=osrm,
        repo=repo,
    )

    gps_usecase = GpsAnalysisUseCase(
        gps_repo=repo,
        route_repo=repo,
        trip_repo=repo,
        routing_service=osrm,
        radius_m=settings.intersection_radius_m,
        speed_threshold=settings.intersection_speed_threshold,
        off_route_threshold_m=settings.off_route_threshold_m,
    )

    # ---- app.state経由でルーターに公開 ----
    app.state.settings = settings
    app.state.repo = repo
    app.state.gps_usecase = gps_usecase
    app.state.route_usecase = route_usecase

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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
