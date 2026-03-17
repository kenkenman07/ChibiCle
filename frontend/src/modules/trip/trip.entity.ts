export type Trip = TripType;

//仮。どこで使われるかわからないからキムと相談

type LatLng = [number, number];
type Intersection = {
  index: number;
  lat: number;
  lng: number;
  num_roads: number;
  stopped: boolean;
  min_speed_kmh: number | null;
};

type TripType = {
  id: string;
  route: {
    geometry: LatLng[];
    intersections: Intersection[];
    distance_m: number;
    duration_s: number;
  };
};
