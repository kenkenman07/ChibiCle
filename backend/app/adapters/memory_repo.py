"""In-memory repository — implements all domain repository ports.

Replace with SupabaseRepository when ready for production.
"""

from datetime import datetime, timezone

from app.domain.models import GpsPoint, Trip, Violation


class InMemoryRepository:
    """Satisfies TripRepository, GpsRepository, and ViolationRepository protocols."""

    def __init__(self) -> None:
        self._trips: dict[str, Trip] = {}
        self._gps: dict[str, list[GpsPoint]] = {}
        self._violations: dict[str, list[Violation]] = {}
        self._violation_times: dict[tuple[str, str], datetime] = {}

    # -- TripRepository --

    def get(self, trip_id: str) -> Trip | None:
        return self._trips.get(trip_id)

    def save(self, trip: Trip) -> None:
        self._trips[trip.id] = trip

    def list_all(self) -> list[Trip]:
        return sorted(self._trips.values(), key=lambda t: t.started_at, reverse=True)

    # -- GpsRepository --

    def get_points(self, trip_id: str) -> list[GpsPoint]:
        return self._gps.get(trip_id, [])

    def append_points(self, trip_id: str, points: list[GpsPoint]) -> None:
        self._gps.setdefault(trip_id, []).extend(points)

    # -- ViolationRepository --

    def get_violations(self, trip_id: str) -> list[Violation]:
        return self._violations.get(trip_id, [])

    def save_violation(self, trip_id: str, violation: Violation) -> None:
        self._violations.setdefault(trip_id, []).append(violation)
        self._violation_times[(trip_id, violation.type)] = datetime.now(timezone.utc)

    def last_violation_time(self, trip_id: str, vtype: str) -> datetime | None:
        return self._violation_times.get((trip_id, vtype))
