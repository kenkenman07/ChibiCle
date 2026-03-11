"""WebSocket camera endpoint — thin adapter over FrameAnalysisUseCase."""

import asyncio
import json
import time

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["camera"])


@router.websocket("/ws/camera")
async def camera_ws(
    ws: WebSocket,
    trip_id: str = Query(...),
) -> None:
    await ws.accept()

    settings = ws.app.state.settings
    frame_usecase = ws.app.state.frame_usecase
    repo = ws.app.state.repo

    frame_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=100)
    last_pong = time.time()
    running = True

    async def heartbeat() -> None:
        nonlocal running
        while running:
            await asyncio.sleep(settings.ws_heartbeat_interval)
            if time.time() - last_pong > settings.ws_heartbeat_interval + settings.ws_heartbeat_timeout:
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

            # Get latest GPS context from repository
            gps_list = repo.get_points(trip_id)
            if gps_list:
                speed = gps_list[-1].speed_kmh
                lat = gps_list[-1].lat
                lng = gps_list[-1].lng
            else:
                speed, lat, lng = 0.0, 0.0, 0.0

            violation = await frame_usecase.execute(
                trip_id, frame_bytes, speed, lat, lng,
            )

            if violation:
                try:
                    await ws.send_json({
                        "type": "violation",
                        "data": {
                            "violation_type": violation.type,
                            "lat": violation.lat,
                            "lng": violation.lng,
                            "detected_at": violation.detected_at,
                        },
                    })
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
