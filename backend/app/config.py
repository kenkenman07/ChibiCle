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
    red_signal_speed_threshold: float = 5.0  # km/h

    # Stop sign thresholds
    stop_sign_radius_m: float = 10.0
    stop_sign_speed_threshold: float = 3.0  # km/h

    # Overpass API cache
    overpass_cache_ttl_seconds: int = 86400  # 24 hours
    overpass_query_radius_m: float = 500.0

    # WebSocket heartbeat
    ws_heartbeat_interval: float = 30.0
    ws_heartbeat_timeout: float = 5.0

    model_config = {"env_prefix": "BTD_"}
