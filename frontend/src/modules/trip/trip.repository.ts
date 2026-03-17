import { db } from "../../lib/db";
import type { Trip } from "./trip.entity";

export const tripRepository = {
  async insert(trip: Trip) {
    await db.table_trip.add(trip);
  },

  async find() {
    const data = await db.table_trip.toArray();
    if (data == null) throw new Error("routeデータが見つからない");
    return data;
  },

  async delete() {
    await db.table_trip.clear();
  },
};
