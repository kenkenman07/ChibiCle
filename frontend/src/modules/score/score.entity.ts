import type { Database } from "../../../database.types";

export type Score = Database["public"]["Tables"]["score"];
type NotSafety = {
  unStoppedCount: number;
  intersections: {
    index: number;
    lat: number;
    lng: number;
    num_roads: number;
    stopped: boolean;
    min_speed_kmh: number;
  }[];
};

export type ScoreJson = {
  stoppedCount: number;
  notSafety: NotSafety;
};
