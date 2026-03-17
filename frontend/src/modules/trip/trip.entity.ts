export type Trip = TripType;

//仮。どこで使われるかわからないからキムと相談

type LatLng = [number, number];
export type Intersection = {
  index: number;
  lat: number;
  lng: number;
  num_roads: number;
  stopped: boolean;
  min_speed_kmh: number | null;
};

export type Route = {
  geometry: LatLng[];
  intersections: Intersection[];
  distance_m: number;
  duration_s: number;
};

type TripType = {
  id: string;
  route: Route;
};
