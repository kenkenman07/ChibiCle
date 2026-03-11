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
    red_signal_speed_threshold: float = 5.0 # km/h

    # Stop sign thresholds
    stop_sign_radius_m: float = 10.0
    stop_sign_speed_threshold: float = 3.0 # km/h

    # Road analysis thresholds
    road_wrong_side_ratio: float = 0.70
    road_analysis_window: int = 20
    road_violation_cooldown_s: float = 120.0

    # Overpass API cache
    overpass_cache_ttl_seconds: int = 86400 # 24 hours
    overpass_query_radius_m: float = 5.0

    model_config = {"env_prefix": "BTD_"}