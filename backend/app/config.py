from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: list[str] = [
        "https://localhost:5173",
        "https://127.0.0.1:5173",
    ]

    # YOLO
    yolo_model: str = "yolov8n.pt"
    yolo_confidence: float = 0.4

    # Signal violation thresholds
    red_signal_speed_threshold: float = 3.0  # km/h — low enough to catch slow intersection entry
    red_signal_min_bbox_ratio: float = 0.003  # Filter A: BB must be ≥0.3% of frame area
    red_signal_proximity_m: float = 25.0  # Filter B: must be within 25m of a traffic signal

    # Stop sign thresholds
    stop_sign_radius_m: float = 10.0
    stop_sign_speed_threshold: float = 1.5  # km/h — law requires full stop; allows for GPS noise

    # Violation cooldown
    violation_cooldown_s: float = 120.0

    # Overpass API cache
    overpass_cache_ttl_seconds: int = 86400  # 24 hours
    overpass_query_radius_m: float = 500.0

    # WebSocket heartbeat
    ws_heartbeat_interval: float = 30.0
    ws_heartbeat_timeout: float = 5.0

    model_config = {"env_prefix": "BTD_"}
