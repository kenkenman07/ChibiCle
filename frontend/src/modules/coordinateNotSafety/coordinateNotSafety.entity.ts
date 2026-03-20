export type CoordinateNotSafety = {
  unStoppedCount: number;
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
};
