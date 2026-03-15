import { db } from "../../lib/db";
import type { Route } from "./route.entity";

export const routeRepository = {
  async insert(route: Route) {
    await db.table_1.add(route);
  },
};
