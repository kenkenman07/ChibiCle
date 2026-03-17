import type { Database } from "../../../database.types";

export type Score = Database["public"]["Tables"]["score"];

//notSafetyIntersections→→オブジェクトの配列
export type ScoreJson = {
  intersectionNumber: number;
  stoppedCount: number;
  notSafetyIntersections: {
    lat: number;
    lng: number;
  }[];
};
