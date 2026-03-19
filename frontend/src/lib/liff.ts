import liff from "@line/liff";

export const initLiff = async () => {
  await liff.init({
    liffId: import.meta.env.VITE_LIFF_ID,
  });

  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  return liff;
};

