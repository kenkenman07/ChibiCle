"""Pure domain entities — no framework dependencies."""

from dataclasses import dataclass


@dataclass(frozen=True)
class GpsPoint:
    lat: float
    lng: float
    speed_kmh: float
    accuracy_m: float
    recorded_at: str


@dataclass(frozen=True)
class Violation:
    type: str
    lat: float
    lng: float
    detected_at: str


@dataclass
class Trip:
    id: str
    started_at: str
    ended_at: str | None = None
    distance_m: float = 0.0


@dataclass(frozen=True)
class StopSign:
    lat: float
    lng: float
    osm_id: int


@dataclass(frozen=True)
class TrafficSignal:
    lat: float
    lng: float
    osm_id: int


