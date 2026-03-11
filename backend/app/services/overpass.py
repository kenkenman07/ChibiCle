"""Overpass API client for querying OSM stop sign nodes, with grid-based caching."""

import time
from dataclasses import dataclass

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


@dataclass
class StopSign:
    lat: float
    lng: float
    osm_id: int


class OverpassCache:
    def __init__(self, ttl_seconds: int = 86400, query_radius_m: float = 500.0) -> None:
        self.ttl = ttl_seconds
        self.radius = query_radius_m
        self._cache: dict[str, tuple[float, list[StopSign]]] = {}

    def _grid_key(self, lat: float, lng: float) -> str:
        """Quantize coordinates to ~500 m grid cells."""
        grid_size = 0.005  # ~500 m at mid-latitudes
        glat = round(lat / grid_size) * grid_size
        glng = round(lng / grid_size) * grid_size
        return f"{glat:.3f},{glng:.3f}"

    async def get_stop_signs(self, lat: float, lng: float) -> list[StopSign]:
        key = self._grid_key(lat, lng)
        now = time.time()

        if key in self._cache:
            ts, signs = self._cache[key]
            if now - ts < self.ttl:
                return signs

        center_lat, center_lng = (float(v) for v in key.split(","))
        query = (
            f'[out:json][timeout:10];'
            f'node["highway"="stop"](around:{self.radius},{center_lat},{center_lng});'
            f'out body;'
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    OVERPASS_URL,
                    data={"data": query},
                    timeout=15.0,
                )
                resp.raise_for_status()

            elements = resp.json().get("elements", [])
            signs = [
                StopSign(lat=e["lat"], lng=e["lon"], osm_id=e["id"])
                for e in elements
            ]
        except (httpx.HTTPError, KeyError):
            signs = []

        self._cache[key] = (now, signs)
        return signs
