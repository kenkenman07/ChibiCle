"""Overpass API gateway — implements StopSignSource and TrafficSignalSource."""

import time

import httpx

from app.domain.models import StopSign, TrafficSignal

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


class OverpassGateway:
    """Grid-based caching Overpass client.

    Satisfies StopSignSource and TrafficSignalSource protocols.
    """

    def __init__(self, ttl_seconds: int = 86400, query_radius_m: float = 500.0) -> None:
        self._ttl = ttl_seconds
        self._radius = query_radius_m
        self._stop_cache: dict[str, tuple[float, list[StopSign]]] = {}
        self._signal_cache: dict[str, tuple[float, list[TrafficSignal]]] = {}

    def _grid_key(self, lat: float, lng: float) -> str:
        grid_size = 0.005  # ~500 m at mid-latitudes
        glat = round(lat / grid_size) * grid_size
        glng = round(lng / grid_size) * grid_size
        return f"{glat:.3f},{glng:.3f}"

    # -- StopSignSource --

    async def get_stop_signs(self, lat: float, lng: float) -> list[StopSign]:
        key = self._grid_key(lat, lng)
        now = time.time()

        if key in self._stop_cache:
            ts, signs = self._stop_cache[key]
            if now - ts < self._ttl:
                return signs

        center_lat, center_lng = (float(v) for v in key.split(","))
        query = (
            f'[out:json][timeout:10];'
            f'node["highway"="stop"](around:{self._radius},{center_lat},{center_lng});'
            f'out body;'
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    OVERPASS_URL, data={"data": query}, timeout=15.0,
                )
                resp.raise_for_status()

            signs = [
                StopSign(lat=e["lat"], lng=e["lon"], osm_id=e["id"])
                for e in resp.json().get("elements", [])
            ]
        except (httpx.HTTPError, KeyError):
            signs = []

        self._stop_cache[key] = (now, signs)
        return signs

    # -- TrafficSignalSource --

    async def get_traffic_signals(self, lat: float, lng: float) -> list[TrafficSignal]:
        key = self._grid_key(lat, lng)
        now = time.time()

        if key in self._signal_cache:
            ts, signals = self._signal_cache[key]
            if now - ts < self._ttl:
                return signals

        center_lat, center_lng = (float(v) for v in key.split(","))
        query = (
            f'[out:json][timeout:10];'
            f'node["highway"="traffic_signals"]'
            f'(around:{self._radius},{center_lat},{center_lng});'
            f'out body;'
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    OVERPASS_URL, data={"data": query}, timeout=15.0,
                )
                resp.raise_for_status()

            signals = [
                TrafficSignal(lat=e["lat"], lng=e["lon"], osm_id=e["id"])
                for e in resp.json().get("elements", [])
            ]
        except (httpx.HTTPError, KeyError):
            signals = []

        self._signal_cache[key] = (now, signals)
        return signals

