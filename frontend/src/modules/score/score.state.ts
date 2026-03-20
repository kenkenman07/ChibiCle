import { atom, useAtom } from "jotai";
import type { ScoreJson } from "./score.entity";

const scoreAtom = atom<ScoreJson>();

export const useScoreStore = () => {
  const [score, setScore] = useAtom(scoreAtom);
  return { score, set: setScore };
};
