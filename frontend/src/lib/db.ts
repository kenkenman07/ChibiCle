import Dexie from "dexie";
import type { Trip } from "../modules/trip/trip.entity";
import type { GpsPointsSynced } from "../modules/gpsPointSynced/gpsPointSynced.entity";
import type { Intersection } from "../api/apiClient";

export class DrivingDatabase extends Dexie {
  // Trip uses string id key
  table_trip!: Dexie.Table<Trip, string>;
  table_intersection_result!: Dexie.Table<Intersection, number>;
  table_gps_points_synced!: Dexie.Table<GpsPointsSynced, number>;

  constructor() {
    super("DrivingDatabase"); // データベース名をsuperのコンストラクタに渡す

    //"主キー", "インデックス(whereの候補に使える)"
    this.version(1).stores({
      table_trip: "id",
      table_intersection_result: "index",
      table_gps_points_synced: "++id, synced",
    });
  }
}

export const db = new DrivingDatabase();
