import { db } from "../../lib/db";
import type { Route } from "./route.entity";

export const routeRepository = {
  async insert(route: Route) {
    await db.table_route.add(route);
  },

  async find() {
    const data = await db.table_route.toArray();
    if (data == null) throw new Error("routeデータが見つからない");
    return data;
  },

  async delete() {
    await db.table_route.clear();
  },
};
