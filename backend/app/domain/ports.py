"""Port interfaces (Protocol classes) for dependency inversion.

Domain and use-case layers depend on these protocols.
Adapter layer provides concrete implementations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from .models import GpsPoint, RoadWay, StopSign, Trip, Violation


# ---------------------------------------------------------------------------
# Repository ports
# ---------------------------------------------------------------------------


class TripRepository(Protocol):
    def get(self, trip_id: str) -> Trip | None: ...
    def save(self, trip: Trip) -> None: ...
    def list_all(self) -> list[Trip]: ...


class GpsRepository(Protocol):
    def get_points(self, trip_id: str) -> list[GpsPoint]: ...
    def append_points(self, trip_id: str, points: list[GpsPoint]) -> None: ...


class ViolationRepository(Protocol):
    def get_violations(self, trip_id: str) -> list[Violation]: ...
    def save_violation(self, trip_id: str, violation: Violation) -> None: ...
    def last_violation_time(self, trip_id: str, vtype: str) -> datetime | None: ...


# ---------------------------------------------------------------------------
# Gateway ports (external services)
# ---------------------------------------------------------------------------


class StopSignSource(Protocol):
    async def get_stop_signs(self, lat: float, lng: float) -> list[StopSign]: ...


class RoadGeometrySource(Protocol):
    async def get_roads(self, lat: float, lng: float) -> list[RoadWay]: ...


class RedSignalAnalyzer(Protocol):
    """Analyze a JPEG frame and return True if a red traffic signal is detected."""
    async def detect(self, frame_jpeg: bytes) -> bool: ...
