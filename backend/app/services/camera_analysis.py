"""YOLOv8n + OpenCV: traffic light detection and red signal analysis."""

import cv2
import numpy as np
from numpy.typing import NDArray
from ultralytics import YOLO

TRAFFIC_LIGHT_CLASS = 9  # COCO class index


def detect_red_signal(
    frame_bytes: bytes,
    model: YOLO,
    confidence: float = 0.4,
) -> list[dict]:
    """
    Decode JPEG, run YOLOv8, check if detected traffic lights are red.

    Returns list of dicts with keys: bbox, confidence, is_red
    """
    nparr = np.frombuffer(frame_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return []

    results = model(img, conf=confidence, verbose=False)
    detections: list[dict] = []

    for result in results:
        for box in result.boxes:
            if int(box.cls[0]) != TRAFFIC_LIGHT_CLASS:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            roi = img[y1:y2, x1:x2]
            if roi.size == 0:
                continue

            detections.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float(box.conf[0]),
                    "is_red": _check_red_hsv(roi),
                }
            )

    return detections


def _check_red_hsv(roi: NDArray[np.uint8]) -> bool:
    """
    Analyze the upper third of a traffic light ROI for red color in HSV space.

    Red hue wraps around 0 in HSV:
      - Low range: H 0-10, S 70-255, V 50-255
      - High range: H 170-180, S 70-255, V 50-255

    Returns True if red pixels exceed 15% of the upper third area.
    """
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    h = roi.shape[0]
    upper_third = hsv[: h // 3, :, :]
    if upper_third.size == 0:
        return False

    mask_low = cv2.inRange(upper_third, (0, 70, 50), (10, 255, 255))
    mask_high = cv2.inRange(upper_third, (170, 70, 50), (180, 255, 255))
    mask = mask_low | mask_high

    red_ratio = np.count_nonzero(mask) / max(mask.size, 1)
    return bool(red_ratio > 0.15)
