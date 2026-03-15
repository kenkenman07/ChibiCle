import { db } from "../../lib/db";
import type { IntersectionResults } from "./intersectionResults.entity";

export const routeRepository = {
  async insert(intersectionResults: IntersectionResults) {
    await db.table_intersection_result.add(intersectionResults);
  },
};
