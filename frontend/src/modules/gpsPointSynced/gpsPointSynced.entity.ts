import type { GpsPoint } from "../gps/gps.entity";

export type GpsPointsSynced = {
  id?: number;
  point: GpsPoint;
  synced: 0 | 1;
};

//0: false, 1:true
