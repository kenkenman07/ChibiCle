from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

# GPS

class GpsPointIn(BaseModel):
    lat: float
    lng: float
    speed_kmh: float
    accuracy_m: float
    recorded_at: str

class GpsBatchRequest(BaseModel):
    trip_id: str
    points: list[GpsPointIn]

class ViolationOut(BaseModel):
    type: Literal["signal_ignore", "no_step", "right_side_riding"]
    lat: float
    lng: float
    detected_at: str

# Trips

class TripCreateRequest(BaseModel):
    id: str | None = None

class TripOut(BaseModel):
    id: str
    started_at: str
    ended_at: str | None = None
    distance_m: float = 0.0
    violation_count: int = 0