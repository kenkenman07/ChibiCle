"""FastAPIアプリケーション — クリーンアーキテクチャDI配線。"""

import logging
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # ---- アダプター層（最外層） ----
    repo = InMemoryRepository()

    osrm = OsrmGateway(
        base_url=settings.osrm_base_url,
        min_roads=settings.intersection_min_roads,
        filter_non_public_roads=settings.filter_non_public_roads,
        overpass_url=settings.overpass_api_url,
        public_road_radius_m=settings.public_road_radius_m,
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

    # 起動時に登録済みルート一覧をログ出力
    logger.info("=== 登録済みエンドポイント ===")
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if methods and path:
            logger.info("  %s %s", ", ".join(methods), path)
    logger.info("=============================")

    yield


app = FastAPI(title="Blue Ticket Driving API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_all else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router)
app.include_router(gps.router)


@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(">>> %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("<<< %s %s → %s", request.method, request.url.path, response.status_code)
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
