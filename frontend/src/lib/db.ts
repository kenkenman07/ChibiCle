import Dexie from "dexie";
import type { Route } from "../modules/route/route.entity";
import type { IntersectionResults } from "../modules/intersectionResults/intersectionResults.entity";
import type { GpsPoint } from "../modules/gpsPoint/gpsPoint.entity";

export class DrivingDatabase extends Dexie {
  table_1!: Dexie.Table<Route, number>;
  table_2!: Dexie.Table<IntersectionResults, number>;
  table_3!: Dexie.Table<GpsPoint, number>;

  constructor() {
    super("DrivingDatabase"); // データベース名をsuperのコンストラクタに渡す

    //"主キー", "インデックス(whereの候補に使える)"
    this.version(1).stores({
      table_1: "id",
      table_2: "id",
      table_3: "id",
    });
  }
}

export const db = new DrivingDatabase();
