import Dexie from "dexie";
import type { Route } from "../modules/route/route.entity";
import type { IntersectionResults } from "../modules/intersectionResults/intersectionResults.entity";
import type { GpsPointsSynced } from "../modules/gpsPointSynced/gpsPointSynced.entity";

export class DrivingDatabase extends Dexie {
  table_route!: Dexie.Table<Route, number>;
  table_intersection_result!: Dexie.Table<IntersectionResults, number>;
  table_gps_points_synced!: Dexie.Table<GpsPointsSynced, number>;

  constructor() {
    super("DrivingDatabase"); // データベース名をsuperのコンストラクタに渡す

    //"主キー", "インデックス(whereの候補に使える)"
    this.version(1).stores({
      table_route: "id",
      table_intersection_result: "id",
      table_gps_points_synced: "id",
    });
  }
}

export const db = new DrivingDatabase();
