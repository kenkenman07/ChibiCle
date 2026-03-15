import type { GpsPoint } from "../gps/gps.types";

export type GpsPointsSynced = {
  point: GpsPoint;
  synced: boolean;
};
