from datatime import datatime, timezone

from ..models import Violation
from ..ports import RedSignalAnalyzer
from .base import FrameViolationDetector

class RedSignalDetector(FrameViolationDetector):
    def __init__(
        self,
        analyzer: RedSignalAnalyzer,
        speed_threshold: float = 5.0,
    ) -> None:
        self._analyzer = analyzer
        self._speed_threshold = speed_threshold

    async def detect(
        self,
        frame_jpeg: bytes,
        speed_kmh: float,
        lat: float,
        lng: float,
    ) -> Violation | None:
        if speed_kmh < self._speed_threshold:
            return None

        is_red = await self._analyzer.detect(frame_jpeg)
        if is_red:
            return Violation(
                type="signal_ignore",
                lat=lat,
                lng=lng,
                detected_at=datetime.now(timezone.utc).isoformat()
            )
