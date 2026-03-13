"""Use case: analyse a camera frame and detect violations."""

from datetime import datetime, timezone

from app.domain.detectors.base import FrameViolationDetector
from app.domain.models import Violation
from app.domain.ports import ViolationRepository


class FrameAnalysisUseCase:
    def __init__(
        self,
        detectors: list[FrameViolationDetector],
        violation_repo: ViolationRepository,
        cooldown_s: float = 120.0,
    ) -> None:
        self._detectors = detectors
        self._violation_repo = violation_repo
        self._cooldown_s = cooldown_s

    async def execute(
        self,
        trip_id: str,
        frame_jpeg: bytes,
        speed_kmh: float,
        lat: float,
        lng: float,
    ) -> Violation | None:
        now = datetime.now(timezone.utc)

        for detector in self._detectors:
            v = await detector.detect(frame_jpeg, speed_kmh, lat, lng)
            if v is not None:
                last = self._violation_repo.last_violation_time(trip_id, v.type)
                if last is None or (now - last).total_seconds() >= self._cooldown_s:
                    self._violation_repo.save_violation(trip_id, v)
                    return v
        return None
