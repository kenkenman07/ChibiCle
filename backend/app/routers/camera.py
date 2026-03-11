"""WebSocket endpoint for real-time camera frame analysis with YOLOv8."""

import asyncio
import json
import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.services.camera_analysis import detect_red_signal
from app.store import Violation, store

router = APIRouter(tags=["camera"])


@router.websocket("/ws/camera")
async def camera_ws(
    ws: WebSocket,
    trip_id: str = Query(...),
) -> None:
    await ws.accept()

    model = ws.app.state.yolo_model
    settings = ws.app.state.settings

    frame_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=100)
    last_pong = time.time()
    running = True

    async def heartbeat() -> None:
        nonlocal running
        while running:
            await asyncio.sleep(settings.ws_heartbeat_interval)
            elapsed = time.time() - last_pong
            if elapsed > settings.ws_heartbeat_interval + settings.ws_heartbeat_timeout:
                await ws.close(code=1000, reason="heartbeat timeout")
                running = False
                return
            try:
                await ws.send_json({"type": "ping"})
            except Exception:
                running = False
                return

    async def process_frames() -> None:
        nonlocal running
        while running:
            try:
                frame_bytes = await asyncio.wait_for(frame_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            detections = await asyncio.to_thread(
                detect_red_signal, frame_bytes, model, settings.yolo_confidence
            )

            for det in detections:
                # Get latest GPS speed for this trip
                gps_list = store.gps_points.get(trip_id, [])
                current_speed = gps_list[-1].speed_kmh if gps_list else 0
                latest_lat = gps_list[-1].lat if gps_list else 0
                latest_lng = gps_list[-1].lng if gps_list else 0

                if det["is_red"]:
                    if current_speed > settings.red_signal_speed_threshold:
                        now = datetime.now(timezone.utc).isoformat()
                        violation = Violation(
                            id=str(uuid4()),
                            trip_id=trip_id,
                            type="signal_ignore",
                            detected_at=now,
                            lat=latest_lat,
                            lng=latest_lng,
                        )
                        store.violations.setdefault(trip_id, []).append(violation)

                        try:
                            await ws.send_json(
                                {
                                    "type": "violation",
                                    "data": {
                                        "violation_type": "signal_ignore",
                                        "lat": latest_lat,
                                        "lng": latest_lng,
                                        "detected_at": now,
                                    },
                                }
                            )
                        except Exception:
                            running = False
                            return
                    else:
                        try:
                            await ws.send_json(
                                {
                                    "type": "detection",
                                    "data": {
                                        "signal": "red",
                                        "speed_kmh": current_speed,
                                    },
                                }
                            )
                        except Exception:
                            running = False
                            return

    hb_task = asyncio.create_task(heartbeat())
    process_task = asyncio.create_task(process_frames())

    try:
        while running:
            msg = await ws.receive()

            if msg.get("type") == "websocket.disconnect":
                break

            if "bytes" in msg and msg["bytes"]:
                try:
                    frame_queue.put_nowait(msg["bytes"])
                except asyncio.QueueFull:
                    # Backpressure: drop oldest, keep newest
                    try:
                        frame_queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                    frame_queue.put_nowait(msg["bytes"])

            elif "text" in msg and msg["text"]:
                try:
                    data = json.loads(msg["text"])
                    if data.get("type") == "pong":
                        last_pong = time.time()
                except (json.JSONDecodeError, TypeError):
                    pass

    except WebSocketDisconnect:
        pass
    finally:
        running = False
        hb_task.cancel()
        process_task.cancel()
