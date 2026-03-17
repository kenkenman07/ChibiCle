import { atom, useAtom } from "jotai";
import type { GpsPoint } from "./gps.entity";

const gpsAtom = atom<GpsPoint | null>(null);

export const useGpsStore = () => {
  const [currentGps, setCurrentGps] = useAtom(gpsAtom);
  return { currentGps, set: setCurrentGps };
};
