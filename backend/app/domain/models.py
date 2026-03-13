"""純粋なドメインエンティティ — フレームワーク依存なし。"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GpsPoint:
    lat: float
    lng: float
    speed_kmh: float
    accuracy_m: float
    recorded_at: str


@dataclass
class Trip:
    id: str
    started_at: str
    ended_at: str | None = None
    distance_m: float = 0.0
    destination_lat: float | None = None
    destination_lng: float | None = None


@dataclass(frozen=True)
class Intersection:
    """経路上の交差点"""
    index: int          # 交差点の順番（0-indexed）
    lat: float
    lng: float
    num_roads: int      # 接続道路数（3以上で「交差点」）


@dataclass
class IntersectionResult:
    """交差点での一時停止結果"""
    intersection: Intersection
    stopped: bool = False
    min_speed_kmh: float | None = None


@dataclass
class Route:
    """OSRMルート"""
    geometry: list[tuple[float, float]] = field(default_factory=list)  # [(lat, lng), ...]
    intersections: list[Intersection] = field(default_factory=list)
    distance_m: float = 0.0
    duration_s: float = 0.0
