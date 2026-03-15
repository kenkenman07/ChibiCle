import { number } from "framer-motion";

export type Route = {
  id: number;
};

//仮。どこで使われるかわからないからキムと相談
const RouteType = {
  route: {
    geometry: [["lat", "lng"]],
    intersections: [
      {
        index: 0,
        lat: 35.685,
        lng: 139.77,
        num_roads: 3,
        stopped: false,
        min_speed_kmh: null,
      },
    ],
    distance_m: 2345.6,
    duration_s: 480.0,
  },
};
