import { db } from "../../lib/db";
import type { Intersection } from "../trip/trip.entity";
export const intersectionResultsRepository = {
  async insert(intersectionResults: Intersection[]) {
    await db.table_intersection_result.add(intersectionResults);
  },

  async find() {
    const data = await db.table_intersection_result.toArray();
    if (data == null)
      throw new Error("intersection_resultデータが見つからない");
    return data;
  },

  async delete() {
    await db.table_intersection_result.clear();
  },
};
