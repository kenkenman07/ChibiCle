from datetime import datetime, timezone

from app.domain.detectors.base import GpsViolationDetector
from app.domain.models import GpsPoint, Violation
from app.domain.ports import GpsRepository, ViolationRepository


class GpsAnalysisUseCase:
    def __init__(
        self,
        detectors: list[GpsViolationDetector],
        gps_repo: GpsRepository,
        violation_repo: ViolationRepository,
        cooldown_s: float = 120.0,
    ) -> None:
        self._detectors = detectors
        self._gps_repo = gps_repo
        self._violation_repo = violation_repo
        self._cooldown_s = cooldown_s

    async def execute(
        self,
        trip_id: str,
        points: list[GpsPoint],
    ) -> list[Violation]:
        self._gps_repo.append_points(trip_id, points)
        history = self._gps_repo.get_points(trip_id)

        now = datetime.now(timezone.utc)
        result: list[Violation] = []

        for detector in self._detectors:
            violations = await detector.detect(points, history)
            for v in violations:
                last = self._violation_repo.last_violation_time(trip_id, v.type)
                if last is None or (now - last).total_seconds() >= self._cooldown_s:
                    self._violation_repo.save_violation(trip_id, v)
                    result.append(v)

        return result
