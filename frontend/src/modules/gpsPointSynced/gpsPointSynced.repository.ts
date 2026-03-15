import { db } from "../../lib/db";
import type { GpsPointsSynced } from "./gpsPointSynced.entity";

export const routeRepository = {
  async insert(gpsPointSynced: GpsPointsSynced) {
    await db.table_gps_points_synced.add(gpsPointSynced);
  },
};
