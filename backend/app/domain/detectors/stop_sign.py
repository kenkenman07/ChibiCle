from geopy.distance import geodesic

from ..models import GpsPoint, Violation
from ..ports import StopSignSource
from .base import GpsViolationDetector


class StopSignDetector(GpsViolationDetector):
    def __init__(
        self,
        source: StopSignSource,
        radius_m: float = 10.0,
        speed_threshold: float = 3.0,
    ) -> None:
        self._source = source
        self._radius_m = radius_m
        self._speed_threshold = speed_threshold

    async def detect(
        self,
        new_points: list[GpsPoint],
        history: list[GpsPoint],
    ) -> list[Violation]:
        if not new_points:
            return []

        violations: list[Violation] = []
        checked_signs: set[int] = set()

        for i, pt in enumerate(new_points):
            if pt.accuracy_m > 20:
                continue

            signs = await self._source.get_stop_signs(pt.lat, pt.lng)

            for sign in signs:
                if sign.osm_id in checked_signs:
                    continue

                dist = geodesic((pt.lat, pt.lng), (sign.lat, sign.lng)).meters
                if dist > self._radius_m:
                    continue

                # Check window: 5 points before and after
                window_start = max(0, i - 5)
                window_end = min(len(new_points), i + 6)
                window = new_points[window_start:window_end]

                stopped = any(
                    p.speed_kmh < self._speed_threshold
                    for p in window
                    if p.accuracy_m <= 20
                )

                if not stopped:
                    violations.append(
                        Violation(
                            type="no_stop",
                            lat=sign.lat,
                            lng=sign.lng,
                            detected_at=pt.recorded_at,
                        )
                    )
                    checked_signs.add(sign.osm_id)

        return violations
