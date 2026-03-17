import { atom, useAtom } from "jotai";
import type { Score } from "./score.entity";

const scoreAtom = atom<Score>();

export const useScoreStore = () => {
  const [score, setScore] = useAtom(scoreAtom);
  return { score, set: setScore };
};
