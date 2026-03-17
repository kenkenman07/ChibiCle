export type GpsPoint = {
  lat: number;
  lng: number;
  speed_kmh: number | null;
  accuracy_m: number;
  recorded_at: string;
};
