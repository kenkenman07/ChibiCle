"""Detect "failure to stop" violations by checking GPS speed near OSM stop signs."""

from geopy.distance import geodesic

from app.models.schemas import GpsPointIn
from app.services.overpass import OverpassCache


async def check_stop_violations(
    points: list[GpsPointIn],
    cache: OverpassCache,
    radius_m: float = 10.0,
    speed_threshold: float = 3.0,
) -> list[dict]:
    """
    For each GPS point within `radius_m` of a stop sign, check whether the
    rider's speed dropped below `speed_threshold` in a surrounding window.

    Returns a list of violation dicts: {type, lat, lng, detected_at}.
    """
    if not points:
        return []

    violations: list[dict] = []
    checked_signs: set[int] = set()

    for i, pt in enumerate(points):
        if pt.accuracy_m > 20:
            continue

        signs = await cache.get_stop_signs(pt.lat, pt.lng)

        for sign in signs:
            if sign.osm_id in checked_signs:
                continue

            dist = geodesic((pt.lat, pt.lng), (sign.lat, sign.lng)).meters
            if dist > radius_m:
                continue

            # Check window: 5 points before and after
            window_start = max(0, i - 5)
            window_end = min(len(points), i + 6)
            window = points[window_start:window_end]

            stopped = any(
                p.speed_kmh < speed_threshold
                for p in window
                if p.accuracy_m <= 20
            )

            if not stopped:
                violations.append(
                    {
                        "type": "no_stop",
                        "lat": sign.lat,
                        "lng": sign.lng,
                        "detected_at": pt.recorded_at,
                    }
                )
                checked_signs.add(sign.osm_id)

    return violations
