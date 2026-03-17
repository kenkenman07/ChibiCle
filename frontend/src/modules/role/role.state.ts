import { atom, useAtom } from "jotai";

export type Role = "child" | "parent" | null;

const roleAtom = atom<Role | null>(null);

export const useRoleStore = () => {
  const [role, setRole] = useAtom(roleAtom);
  return { role, set: setRole };
};
