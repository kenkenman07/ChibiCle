import { atom, useAtom } from "jotai";
import type { Route } from "./route.entity";

const routeAtom = atom<Route>();

export const useRouteStore = () => {
  const [route, setRoute] = useAtom(routeAtom);
  return { route, set: setRoute };
};
