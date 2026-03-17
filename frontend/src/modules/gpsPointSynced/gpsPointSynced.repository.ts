import { db } from "../../lib/db";
import type { GpsPointsSynced } from "./gpsPointSynced.entity";

export const gpsPointSyncedRepository = {
  async insert(gpsPointSynced: GpsPointsSynced) {
    await db.table_gps_points_synced.add(gpsPointSynced);
  },

  async findUnSynced() {
    const data = await db.table_gps_points_synced
      .where("synced")
      .equals(0)
      .toArray();
    if (data == null) throw new Error("gps_points_syncedデータが見つからない");
    return data;
  },

  async update(id: number) {
    await db.table_gps_points_synced.update(id, {
      synced: 1,
    });
  },
};
