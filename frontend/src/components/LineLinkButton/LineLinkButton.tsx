import { MessageCircle } from "lucide-react";
import { useCurrentUserStore } from "../../modules/auth/current-user.state";
import { userLineRepository } from "../../modules/userLine/userLine.repository";
import { useEffect } from "react";
import liff from "@line/liff";

export default function LineLinkButton() {
  const { currentUser } = useCurrentUserStore();

  useEffect(() => {
    if (!currentUser) return;
    const insertProfile = async () => {
      await liff.init({
        liffId: import.meta.env.VITE_LIFF_ID,
      });

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        await userLineRepository.insert(currentUser.id, profile.userId);
      } else {
        console.log("ログインしていない");
      }
    };

    insertProfile();
  }, [currentUser]);

  const handleLink = async () => {
    await liff.init({
      liffId: import.meta.env.VITE_LIFF_ID,
    });

    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  return (
    <button
      onClick={handleLink}
      className="w-full bg-[#06C755] text-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-95 transition-transform"
    >
      <div className="p-2 bg-white/20 rounded-xl">
        <MessageCircle className="w-5 h-5 text-white" />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold">LINEアカウントを連携する</p>
        <p className="text-xs text-white/80">走行結果の通知を受け取れます</p>
      </div>
    </button>
  );
}
