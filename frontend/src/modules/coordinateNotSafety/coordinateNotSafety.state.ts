import { atom, useAtom } from "jotai";
import type { CoordinateNotSafety } from "./coordinateNotSafety.entity";

const coordinateNotSafetyAtom = atom<CoordinateNotSafety>();

export const useCoordinateNotSafetyStore = () => {
  const [coordinateNotSafety, setCoordinateNotSafety] = useAtom(
    coordinateNotSafetyAtom
  );
  return { coordinateNotSafety, set: setCoordinateNotSafety };
};
