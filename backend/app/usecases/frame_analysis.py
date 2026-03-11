"""Use case: analyse a camera frame and detect violations."""

from app.domain.detectors.base import FrameViolationDetector
from app.domain.models import Violation
from app.domain.ports import ViolationRepository


class FrameAnalysisUseCase:
    def __init__(
        self,
        detectors: list[FrameViolationDetector],
        violation_repo: ViolationRepository,
    ) -> None:
        self._detectors = detectors
        self._violation_repo = violation_repo

    async def execute(
        self,
        trip_id: str,
        frame_jpeg: bytes,
        speed_kmh: float,
        lat: float,
        lng: float,
    ) -> Violation | None:
        for detector in self._detectors:
            v = await detector.detect(frame_jpeg, speed_kmh, lat, lng)
            if v is not None:
                self._violation_repo.save_violation(trip_id, v)
                return v
        return None
