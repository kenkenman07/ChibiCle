"""Strategy interfaces for violation detection."""

from abc import ABC, abstractmethod

from ..models import GpsPoint, Violation


class GpsViolationDetector(ABC):
    """Detect violations from GPS trajectory data."""

    @abstractmethod
    async def detect(
        self,
        new_points: list[GpsPoint],
        history: list[GpsPoint],
    ) -> list[Violation]: ...


class FrameViolationDetector(ABC):
    """Detect violations from a single camera frame."""

    @abstractmethod
    async def detect(
        self,
        frame_jpeg: bytes,
        speed_kmh: float,
        lat: float,
        lng: float,
    ) -> Violation | None: ...
