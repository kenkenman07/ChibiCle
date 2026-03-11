"""Overpass API gateway — implements StopSignSource and RoadGeometrySource."""

import time

import httpx

from app.domain.models import RoadWay, StopSign

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


class OverpassGateway:
    """Grid-based caching Overpass client.

    Satisfies StopSignSource and RoadGeometrySource protocols.
    """

    def __init__(self, ttl_seconds: int = 86400, query_radius_m: float = 500.0) -> None:
        self._ttl = ttl_seconds
        self._radius = query_radius_m
        self._stop_cache: dict[str, tuple[float, list[StopSign]]] = {}
        self._road_cache: dict[str, tuple[float, list[RoadWay]]] = {}

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

    # -- RoadGeometrySource --

    async def get_roads(self, lat: float, lng: float) -> list[RoadWay]:
        key = self._grid_key(lat, lng)
        now = time.time()

        if key in self._road_cache:
            ts, roads = self._road_cache[key]
            if now - ts < self._ttl:
                return roads

        center_lat, center_lng = (float(v) for v in key.split(","))
        road_types = (
            "trunk|primary|secondary|tertiary|residential|unclassified"
            "|living_street|cycleway"
            "|trunk_link|primary_link|secondary_link|tertiary_link"
        )
        query = (
            f'[out:json][timeout:15];'
            f'way["highway"~"^({road_types})$"]'
            f'(around:{self._radius},{center_lat},{center_lng});'
            f'out body geom;'
        )

        roads: list[RoadWay] = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    OVERPASS_URL, data={"data": query}, timeout=20.0,
                )
                resp.raise_for_status()

            for e in resp.json().get("elements", []):
                if e.get("type") != "way" or "geometry" not in e:
                    continue
                geom = tuple((n["lat"], n["lon"]) for n in e["geometry"])
                if len(geom) < 2:
                    continue
                tags = e.get("tags", {})
                roads.append(
                    RoadWay(
                        osm_id=e["id"],
                        highway=tags.get("highway", ""),
                        oneway=tags.get("oneway") in ("yes", "1", "true"),
                        geometry=geom,
                    )
                )
        except (httpx.HTTPError, KeyError):
            pass

        self._road_cache[key] = (now, roads)
        return roads
