"""FastAPIアプリケーション — クリーンアーキテクチャDI配線。"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.adapters.memory_repo import InMemoryRepository
from app.adapters.osrm_gateway import OsrmGateway
from app.adapters.routers import gps, trips
from app.config import Settings
from app.usecases.gps_analysis import GpsAnalysisUseCase
from app.usecases.route_planning import RoutePlanningUseCase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = Settings()

# フロントエンドのビルド済みディレクトリ
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


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


# フロントエンドの静的ファイル配信（ビルド済みdistがある場合）
if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse

    # SPAフォールバック: APIに該当しないパスはすべてindex.htmlを返す
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

    logger.info("フロントエンド配信: %s", FRONTEND_DIST)
else:
    logger.info("フロントエンドdistが見つかりません: %s", FRONTEND_DIST)
