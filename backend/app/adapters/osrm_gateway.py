"""OSRMルーティングゲートウェイ — 自転車ルートの取得と交差点の抽出。"""

import logging
import math

import httpx

from app.domain.models import Intersection, Route

logger = logging.getLogger(__name__)

# 道路交通法が適用される公道の highway タグ
PUBLIC_ROAD_TYPES = frozenset({
    "trunk", "trunk_link",
    "primary", "primary_link",
    "secondary", "secondary_link",
    "tertiary", "tertiary_link",
    "unclassified",
    "residential",
    "living_street",
})


class OsrmRoutingError(Exception):
    """OSRMルーティングに失敗した場合のエラー。"""


class OsrmGateway:
    """OSRM公開APIを使用してRoutingServiceプロトコルを実装。"""

    def __init__(
        self,
        base_url: str,
        min_roads: int = 3,
        filter_non_public_roads: bool = True,
        overpass_url: str = "https://overpass-api.de/api/interpreter",
        public_road_radius_m: float = 20.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._min_roads = min_roads
        self._filter_non_public_roads = filter_non_public_roads
        self._overpass_url = overpass_url
        self._public_road_radius_m = public_road_radius_m

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

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException:
            logger.error("OSRMリクエストがタイムアウト: %s", url)
            raise OsrmRoutingError("ルーティングサーバーへの接続がタイムアウトしました")
        except httpx.HTTPStatusError as e:
            logger.error("OSRM HTTPエラー %s: %s", e.response.status_code, url)
            raise OsrmRoutingError(
                f"ルーティングサーバーがエラーを返しました (HTTP {e.response.status_code})"
            )
        except httpx.RequestError as e:
            logger.error("OSRMリクエストエラー: %s", e)
            raise OsrmRoutingError("ルーティングサーバーに接続できません")

        if data.get("code") != "Ok":
            msg = data.get("message", "不明なエラー")
            logger.error("OSRMルーティング失敗: %s", msg)
            raise OsrmRoutingError(f"ルートが見つかりません: {msg}")

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

        # 公道フィルタリング
        if self._filter_non_public_roads and intersections:
            intersections = await self._filter_public_road_intersections(
                intersections,
            )

        return Route(
            geometry=geometry,
            intersections=intersections,
            distance_m=osrm_route["distance"],
            duration_s=osrm_route["duration"],
        )

    # ------------------------------------------------------------------
    # Overpass API による公道フィルタリング
    # ------------------------------------------------------------------

    async def _filter_public_road_intersections(
        self,
        intersections: list[Intersection],
    ) -> list[Intersection]:
        """Overpass APIで公道上の交差点のみを抽出する。失敗時はフィルタなしで返す。"""
        try:
            public_ways = await self._fetch_public_roads(intersections)
        except Exception:
            logger.warning(
                "Overpass APIクエリ失敗 — フィルタなしで全交差点を返します",
                exc_info=True,
            )
            return intersections

        before = len(intersections)
        filtered = [
            isec
            for isec in intersections
            if self._is_near_public_road(isec.lat, isec.lng, public_ways)
        ]
        # 連番を振り直す
        result = [
            Intersection(index=i, lat=f.lat, lng=f.lng, num_roads=f.num_roads)
            for i, f in enumerate(filtered)
        ]
        logger.info(
            "公道フィルタ: %d → %d 交差点 (%d 除外)",
            before,
            len(result),
            before - len(result),
        )
        return result

    async def _fetch_public_roads(
        self,
        intersections: list[Intersection],
    ) -> list[list[tuple[float, float]]]:
        """交差点群のバウンディングボックス内の公道ジオメトリを取得。"""
        lats = [i.lat for i in intersections]
        lngs = [i.lng for i in intersections]
        pad = 0.002  # ~200m のパディング
        bbox = (
            f"{min(lats) - pad},{min(lngs) - pad},"
            f"{max(lats) + pad},{max(lngs) + pad}"
        )

        highway_regex = "|".join(PUBLIC_ROAD_TYPES)
        query = (
            f'[out:json][timeout:25][bbox:{bbox}];'
            f'way["highway"~"^({highway_regex})$"];'
            f'out geom;'
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._overpass_url,
                data={"data": query},
            )
            resp.raise_for_status()
            data = resp.json()

        ways: list[list[tuple[float, float]]] = []
        for element in data.get("elements", []):
            if element.get("type") != "way":
                continue
            geom = element.get("geometry", [])
            coords = [(n["lat"], n["lon"]) for n in geom]
            if coords:
                ways.append(coords)

        logger.info("Overpass: bbox内に公道 %d 本を取得", len(ways))
        return ways

    def _is_near_public_road(
        self,
        lat: float,
        lng: float,
        public_ways: list[list[tuple[float, float]]],
    ) -> bool:
        """交差点が公道のいずれかのノードから閾値以内にあるか判定。"""
        # 度数での高速プレフィルタ（~30m相当、日本の緯度）
        deg_threshold = 0.0003
        threshold = self._public_road_radius_m
        for way in public_ways:
            for wlat, wlng in way:
                if abs(lat - wlat) > deg_threshold or abs(lng - wlng) > deg_threshold:
                    continue
                if _haversine_m(lat, lng, wlat, wlng) <= threshold:
                    return True
        return False


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """2点間の距離をメートルで計算（Haversine公式）。"""
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
