"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

from app.config import Settings
from app.routers import camera, gps, trips
from app.services.overpass import OverpassCache

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Load YOLO model once at startup
    app.state.yolo_model = YOLO(settings.yolo_model)
    app.state.settings = settings
    app.state.overpass_cache = OverpassCache(
        ttl_seconds=settings.overpass_cache_ttl_seconds,
        query_radius_m=settings.overpass_query_radius_m,
    )
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
