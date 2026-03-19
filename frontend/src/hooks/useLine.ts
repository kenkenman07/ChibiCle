import liff from "@line/liff";
import { useEffect, useState } from "react";
//import { initLiff } from "../lib/liff";

export const useLine = () => {
  const [lineUserId, setLineUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLineUserId = async () => {
      await liff.init({
        liffId: import.meta.env.VITE_LIFF_ID,
      });
      if (!liff) return;

      const profile = await liff.getProfile();
      setLineUserId(profile.userId);
    };

    fetchLineUserId();
  }, []);

  return { lineUserId };
};
