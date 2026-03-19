import { db } from "../../lib/db";
import type { IntersectionResults } from "./intersectionResults.entity";
export const intersectionResultsRepository = {
  async insert(intersectionResults: IntersectionResults) {
    await db.table_intersection_result.bulkPut(intersectionResults);
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
