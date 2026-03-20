import { atom, useAtom } from "jotai";
import type { Trip } from "./trip.entity";

const TripAtom = atom<Trip>();

export const useTripStore = () => {
  const [trip, setTrip] = useAtom(TripAtom);
  return { trip, set: setTrip };
};
