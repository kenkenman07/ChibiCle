"""Detect red-signal violations from camera frames.

Two filters prevent false positives from distant/irrelevant signals:
  A. Bounding-box minimum area (applied inside YoloGateway)
  B. GPS proximity to a known traffic signal (applied here)
"""

from datetime import datetime, timezone

from geopy.distance import geodesic

from ..models import Violation
from ..ports import RedSignalAnalyzer, TrafficSignalSource
from .base import FrameViolationDetector


class RedSignalDetector(FrameViolationDetector):
    def __init__(
        self,
        analyzer: RedSignalAnalyzer,
        signal_source: TrafficSignalSource,
        speed_threshold: float = 3.0,
        proximity_m: float = 25.0,
    ) -> None:
        self._analyzer = analyzer
        self._signal_source = signal_source
        self._speed_threshold = speed_threshold
        self._proximity_m = proximity_m

    async def detect(
        self,
        frame_jpeg: bytes,
        speed_kmh: float,
        lat: float,
        lng: float,
    ) -> Violation | None:
        # 1. Speed gate (cheapest check)
        if speed_kmh < self._speed_threshold:
            return None

        # 2. Filter B: GPS proximity to a traffic signal
        signals = await self._signal_source.get_traffic_signals(lat, lng)
        near_signal = any(
            geodesic((lat, lng), (s.lat, s.lng)).meters <= self._proximity_m
            for s in signals
        )
        if not near_signal:
            return None

        # 3. Filter A + YOLO: frame analysis (most expensive)
        is_red = await self._analyzer.detect(frame_jpeg)
        if is_red:
            return Violation(
                type="signal_ignore",
                lat=lat,
                lng=lng,
                detected_at=datetime.now(timezone.utc).isoformat(),
            )
        return None
