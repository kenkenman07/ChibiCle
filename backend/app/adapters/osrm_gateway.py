"""OSRMルーティングゲートウェイ — 自転車ルートの取得と交差点の抽出。"""

import logging
import time

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

# Overpass QL の highway 正規表現（起動時に一度だけ構築）
_HIGHWAY_REGEX = "|".join(PUBLIC_ROAD_TYPES)

# ノードキャッシュ最大サイズ
_NODE_CACHE_MAX = 50_000


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
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._min_roads = min_roads
        self._filter_non_public_roads = filter_non_public_roads
        self._overpass_url = overpass_url
        self._public_road_radius_m = public_road_radius_m
        self._http = http_client

        # OSMノードID → 公道上かどうかのキャッシュ
        self._node_cache: dict[int, bool] = {}

    async def get_bicycle_route(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
    ) -> Route:
        client = self._http or httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
        )
        try:
            return await self._do_route(client, origin, destination)
        finally:
            # 外部注入されたクライアントは閉じない
            if not self._http:
                await client.aclose()

    async def _do_route(
        self,
        client: httpx.AsyncClient,
        origin: tuple[float, float],
        destination: tuple[float, float],
    ) -> Route:
        # OSRMは経度,緯度の順で指定
        coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
        url = (
            f"{self._base_url}/route/v1/bicycle/{coords}"
            "?steps=true&geometries=geojson&overview=full&annotations=nodes"
        )

        t0 = time.monotonic()
        try:
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
        logger.info("OSRM: %.1f秒", time.monotonic() - t0)

        if data.get("code") != "Ok":
            msg = data.get("message", "不明なエラー")
            logger.error("OSRMルーティング失敗: %s", msg)
            raise OsrmRoutingError(f"ルートが見つかりません: {msg}")

        osrm_route = data["routes"][0]

        # ジオメトリを抽出（GeoJSON座標は[経度, 緯度]の順）
        geojson_coords = osrm_route["geometry"]["coordinates"]
        geometry = [(c[1], c[0]) for c in geojson_coords]  # (緯度, 経度)に変換

        # annotation.nodes から座標→OSMノードIDのマッピングを構築
        annotation_nodes: list[int] = []
        for leg in osrm_route["legs"]:
            annotation_nodes.extend(
                leg.get("annotation", {}).get("nodes", [])
            )
        coord_to_node: dict[tuple[float, float], int] = {}
        for i, node_id in enumerate(annotation_nodes):
            if i < len(geojson_coords):
                c = geojson_coords[i]
                key = (round(c[1], 6), round(c[0], 6))
                coord_to_node[key] = node_id

        # ステップから交差点を抽出（OSMノードIDも紐づけ）
        intersections: list[Intersection] = []
        isec_node_ids: list[int | None] = []
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
                    isec_node_ids.append(coord_to_node.get(key))
                    idx += 1

        # 公道フィルタリング
        if self._filter_non_public_roads and intersections:
            intersections = await self._filter_public_road_intersections(
                client, intersections, isec_node_ids,
            )

        return Route(
            geometry=geometry,
            intersections=intersections,
            distance_m=osrm_route["distance"],
            duration_s=osrm_route["duration"],
        )

    # ------------------------------------------------------------------
    # Overpass API による公道フィルタリング（OSMノードIDベース + キャッシュ）
    # ------------------------------------------------------------------

    async def _filter_public_road_intersections(
        self,
        client: httpx.AsyncClient,
        intersections: list[Intersection],
        node_ids: list[int | None],
    ) -> list[Intersection]:
        """Overpass APIで公道上の交差点のみを抽出する。失敗時はフィルタなしで返す。"""
        known = [(isec, nid) for isec, nid in zip(intersections, node_ids) if nid]
        unknown = [isec for isec, nid in zip(intersections, node_ids) if not nid]

        if not known:
            logger.info("公道フィルタ: OSMノードID取得不可 — スキップ")
            return intersections

        all_nids = [nid for _, nid in known]

        try:
            t0 = time.monotonic()
            public_node_set = await self._resolve_public_nodes(client, all_nids)
            elapsed = time.monotonic() - t0
            logger.info("公道判定: %.2f秒", elapsed)
        except Exception:
            logger.warning(
                "Overpass APIクエリ失敗 — フィルタなしで全交差点を返します",
                exc_info=True,
            )
            return intersections

        before = len(intersections)
        filtered = [isec for isec, nid in known if nid in public_node_set]
        filtered.extend(unknown)
        result = [
            Intersection(index=i, lat=f.lat, lng=f.lng, num_roads=f.num_roads)
            for i, f in enumerate(filtered)
        ]
        logger.info(
            "公道フィルタ: %d → %d 交差点 (%d 除外)",
            before, len(result), before - len(result),
        )
        return result

    async def _resolve_public_nodes(
        self,
        client: httpx.AsyncClient,
        node_ids: list[int],
    ) -> set[int]:
        """キャッシュ優先でノードの公道判定を行う。未キャッシュ分のみOverpassに問い合わせ。"""
        public: set[int] = set()
        uncached: list[int] = []

        for nid in node_ids:
            if nid in self._node_cache:
                if self._node_cache[nid]:
                    public.add(nid)
            else:
                uncached.append(nid)

        if not uncached:
            logger.info(
                "公道キャッシュ: %d/%d ヒット (Overpassスキップ)",
                len(node_ids), len(node_ids),
            )
            return public

        logger.info(
            "公道キャッシュ: %d/%d ヒット, %d 件をOverpassに問い合わせ",
            len(node_ids) - len(uncached), len(node_ids), len(uncached),
        )

        queried_public = await self._query_public_road_nodes(client, uncached)

        # キャッシュ更新
        for nid in uncached:
            self._node_cache[nid] = nid in queried_public
        # キャッシュサイズ制限（古いものから削除）
        if len(self._node_cache) > _NODE_CACHE_MAX:
            excess = len(self._node_cache) - _NODE_CACHE_MAX
            keys = list(self._node_cache.keys())[:excess]
            for k in keys:
                del self._node_cache[k]

        return public | queried_public

    async def _query_public_road_nodes(
        self,
        client: httpx.AsyncClient,
        node_ids: list[int],
    ) -> set[int]:
        """指定OSMノードのうち公道wayに属するもののIDセットを返す。"""
        id_str = ",".join(str(n) for n in node_ids)
        # out skel qt: タグ不要（フィルタ済み）、quadtileソートで高速化
        query = (
            f'[out:json][timeout:10];'
            f'node(id:{id_str})->.isec;'
            f'way(bn.isec)["highway"~"^({_HIGHWAY_REGEX})$"];'
            f'out skel qt;'
        )

        resp = await client.post(
            self._overpass_url,
            data={"data": query},
        )
        resp.raise_for_status()
        data = resp.json()

        node_id_set = set(node_ids)
        public_nodes: set[int] = set()
        for element in data.get("elements", []):
            if element.get("type") != "way":
                continue
            for nid in element.get("nodes", []):
                if nid in node_id_set:
                    public_nodes.add(nid)

        logger.info(
            "Overpass: %d ノード中 %d が公道上",
            len(node_ids), len(public_nodes),
        )
        return public_nodes
