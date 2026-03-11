"""YOLO gateway — implements RedSignalAnalyzer port."""

import asyncio

import cv2
import numpy as np
from numpy.typing import NDArray
from ultralytics import YOLO

TRAFFIC_LIGHT_CLASS = 9  # COCO class index


class YoloGateway:
    """Wraps YOLOv8 model to satisfy the RedSignalAnalyzer protocol."""

    def __init__(self, model: YOLO, confidence: float = 0.4) -> None:
        self._model = model
        self._confidence = confidence

    async def detect(self, frame_jpeg: bytes) -> bool:
        """Return True if a red traffic signal is detected in the frame."""
        return await asyncio.to_thread(self._detect_sync, frame_jpeg)

    def _detect_sync(self, frame_jpeg: bytes) -> bool:
        nparr = np.frombuffer(frame_jpeg, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return False

        results = self._model(img, conf=self._confidence, verbose=False)

        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) != TRAFFIC_LIGHT_CLASS:
                    continue
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                roi = img[y1:y2, x1:x2]
                if roi.size == 0:
                    continue
                if _check_red_hsv(roi):
                    return True
        return False


def _check_red_hsv(roi: NDArray[np.uint8]) -> bool:
    """Check the red-light region of a traffic light ROI in HSV space.

    Japan uses mostly horizontal signals (left=red, center=yellow, right=green)
    but vertical signals also exist (top=red, mid=yellow, bottom=green).
    Aspect ratio determines orientation:
      width > height → horizontal → check LEFT 1/3
      height >= width → vertical  → check UPPER 1/3
    """
    h, w = roi.shape[:2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    if w > h:
        # Horizontal signal — red is on the LEFT
        red_region = hsv[:, : w // 3, :]
    else:
        # Vertical signal — red is on the TOP
        red_region = hsv[: h // 3, :, :]

    if red_region.size == 0:
        return False

    mask_low = cv2.inRange(red_region, (0, 70, 50), (10, 255, 255))
    mask_high = cv2.inRange(red_region, (170, 70, 50), (180, 255, 255))
    mask = mask_low | mask_high

    red_ratio = np.count_nonzero(mask) / max(mask.size, 1)
    return bool(red_ratio > 0.15)
