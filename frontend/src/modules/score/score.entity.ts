import type { Database } from "../../../database.types";

export type Score = Database["public"]["Tables"]["score"];

export type ScoreJson = {
  intersectionNumber: number;
  stoppedCount: number;
  notSafetyIntersections: {
    lat: number;
    lng: number;
  }[];
};
