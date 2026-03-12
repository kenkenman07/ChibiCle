from abc import ABC, abstractmethod
from ..models import GpsPoint, Violation

class GpsViolationDetector(ABC):
    # GPSデータから違反検知を行う
    @abstractmethod
    async def detect(
        self,
        new_points: list[GpsPoint],
        history: list[GpsPoint]
    ) -> list[Violation]: ...

class FrameViolationDetector(ABC):
    # カメラのフレームデータから違反検知を行う
    @abstractmethod
    async def detect(
        self,
        frame_jpeg: bytes
        speed_kmh: float,
        lat: float,
        lng: float
    ) -> Violation | None: ...
