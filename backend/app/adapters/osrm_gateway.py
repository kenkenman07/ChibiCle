"""OSRMルーティングゲートウェイ — 自転車ルートの取得と交差点の抽出。"""

import httpx

from app.domain.models import Intersection, Route


class OsrmGateway:
    """OSRM公開APIを使用してRoutingServiceプロトコルを実装。"""

    def __init__(self, base_url: str, min_roads: int = 3) -> None:
        self._base_url = base_url.rstrip("/")
        self._min_roads = min_roads

    async def get_bicycle_route(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
    ) -> Route:
        # OSRMは経度,緯度の順で指定
        coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
        url = (
            f"{self._base_url}/route/v1/bicycle/{coords}"
            "?steps=true&geometries=geojson&overview=full"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        osrm_route = data["routes"][0]

        # ジオメトリを抽出（GeoJSON座標は[経度, 緯度]の順）
        geojson_coords = osrm_route["geometry"]["coordinates"]
        geometry = [(c[1], c[0]) for c in geojson_coords]  # (緯度, 経度)に変換

        # ステップから交差点を抽出
        intersections: list[Intersection] = []
        seen: set[tuple[float, float]] = set()
        idx = 0

        for leg in osrm_route["legs"]:
            for step in leg["steps"]:
                for isec in step.get("intersections", []):
                    bearings = isec.get("bearings", [])
                    if len(bearings) < self._min_roads:
                        continue
                    loc = isec["location"]  # [lng, lat]
                    lat, lng = loc[1], loc[0]
                    key = (round(lat, 6), round(lng, 6))
                    if key in seen:
                        continue
                    seen.add(key)
                    intersections.append(
                        Intersection(
                            index=idx,
                            lat=lat,
                            lng=lng,
                            num_roads=len(bearings),
                        )
                    )
                    idx += 1

        return Route(
            geometry=geometry,
            intersections=intersections,
            distance_m=osrm_route["distance"],
            duration_s=osrm_route["duration"],
        )
