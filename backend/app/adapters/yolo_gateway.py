import asyncio

import cv2
import numpy as np
from numpy.typing import NDArray
from ultralytics import YOLO

TRAFFIC_LIGHT_CLASS = 9 # COCO class index

class YoloGateway:

    def __init__(self, model: YOLO, confidence: float = 0.4) -> None:
        self.model = model
        self._confidence = confidence

    async def detect(self, frame_jpeg: bytes) -> bool:
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
        
        h, w = roi.shape[:2]
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

        if w > h:
            # 横型の信号
            red_region = hsv[:, : w // 3, :]
        else:
            # 縦型の信号
            red_region = hsv[: h // 3, :, :]

        if red_region.size == 0:
            return False

        mask_low = cv2.inRange(red_region, (0, 70, 50), (10, 255, 255))
        mask_high = cv2.inRange(red_region, (170, 70, 50), (180, 255, 255))
        mask = mask_low | mask_high

        red_ratio = np.count_nonzero(mask) / max(mask.size, 1)
        return bool(red_radio > 0.15)