export type Route = RouteType["route"];

//仮。どこで使われるかわからないからキムと相談
type RouteType = {
  route: {
    geometry: [[lat: number, lng: number]];
    intersections: [
      {
        index: number;
        lat: number;
        lng: number;
        num_roads: number;
        stopped: boolean;
        min_speed_kmh: number;
      }
    ];
    distance_m: number;
    duration_s: number;
  };
};
