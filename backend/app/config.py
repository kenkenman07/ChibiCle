from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: list[str] = [
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        "https://localhost:4173",
        "http://localhost:5173",
        "http://localhost:8000",
    ]
    # LAN内からのアクセスを許可（開発用）
    cors_allow_all: bool = True

    # OSRM
    osrm_base_url: str = "https://router.project-osrm.org"

    # Intersection detection
    intersection_radius_m: float = 15.0       # 交差点近接判定半径
    intersection_speed_threshold: float = 3.0  # km/h — 一時停止とみなす速度
    intersection_min_roads: int = 3            # 交差点とみなす最小接続道路数

    # Route deviation
    off_route_threshold_m: float = 50.0  # 経路逸脱判定閾値

    # Public road filtering (Overpass API)
    filter_non_public_roads: bool = True  # 公道上の交差点のみカウント
    overpass_api_url: str = "https://overpass-api.de/api/interpreter"
    public_road_radius_m: float = 20.0  # 交差点と公道の近接判定半径

    model_config = {"env_prefix": "BTD_"}
