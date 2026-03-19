import { useEffect, useState } from "react";
import { initLiff } from "../lib/liff";

export const useLine = () => {
  const [lineUserId, setLineUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLineUserId = async () => {
      // const liff = await initLiff();
      // if (!liff) return;

      const profile = await initLiff();
      if (!profile) return;
      setLineUserId(profile.userId);
    };

    fetchLineUserId();
  }, []);

  return { lineUserId };
};
