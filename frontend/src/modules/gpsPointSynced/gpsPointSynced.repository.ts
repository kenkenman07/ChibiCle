import { db } from "../../lib/db";
import type { GpsPointsSynced } from "./gpsPointSynced.entity";

export const routeRepository = {
  async insert(gpsPointSynced: GpsPointsSynced) {
    await db.table_gps_points_synced.add(gpsPointSynced);
  },

  async find() {
    const data = await db.table_gps_points_synced.toArray();
    if (data == null) throw new Error("gps_points_syncedデータが見つからない");
    return data;
  },
};
