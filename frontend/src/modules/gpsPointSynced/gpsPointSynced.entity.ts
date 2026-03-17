import type { GpsPoint } from "../../hooks/useGps";

export type GpsPointsSynced = {
  point: GpsPoint;
  synced: boolean;
};
