"""In-memory storage for MVP. Replace with Supabase later."""

from dataclasses import dataclass


@dataclass
class Trip:
    id: str
    started_at: str
    ended_at: str | None = None
    distance_m: float = 0.0


@dataclass
class GpsPoint:
    trip_id: str
    lat: float
    lng: float
    speed_kmh: float
    accuracy_m: float
    recorded_at: str


@dataclass
class Violation:
    id: str
    trip_id: str
    type: str  # "signal_ignore" | "no_stop"
    detected_at: str
    lat: float
    lng: float


class InMemoryStore:
    def __init__(self) -> None:
        self.trips: dict[str, Trip] = {}
        self.gps_points: dict[str, list[GpsPoint]] = {}
        self.violations: dict[str, list[Violation]] = {}


store = InMemoryStore()
