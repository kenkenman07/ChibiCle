import { useState, useEffect } from "react";
import { MessageCircle, Check, Loader2 } from "lucide-react";
import { useCurrentUserStore } from "../../modules/auth/current-user.state";
import { userLineRepository } from "../../modules/userLine/userLine.repository";
import { initLiff } from "../../lib/liff";

type LinkState = "loading" | "unlinked" | "linked";

export default function LineLinkButton() {
  const { currentUser } = useCurrentUserStore();
  const [linkState, setLinkState] = useState<LinkState>("loading");

  useEffect(() => {
    if (!currentUser) return;
    checkLinkStatus();
  }, [currentUser]);

  const checkLinkStatus = async () => {
    if (!currentUser) return;
    const record = await userLineRepository.find(currentUser.id);
    setLinkState(record?.line_id ? "linked" : "unlinked");
  };

  const handleLink = async () => {
    if (!currentUser) return;
    setLinkState("loading");
    try {
      const liff = await initLiff();
      if (!liff) return;
      const profile = await liff.getProfile();
      await userLineRepository.insert(currentUser.id, profile.userId);
      setLinkState("linked");
    } catch {
      setLinkState("unlinked");
    }
  };

  if (linkState === "loading") {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">LINE連携を確認中...</span>
      </div>
    );
  }

  if (linkState === "linked") {
    return (
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Check className="w-5 h-5 text-[#48b98b]" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-700">LINE連携済み</p>
          <p className="text-xs text-emerald-600">
            お子さまの走行結果がLINEに届きます
          </p>
        </div>
      </div>
    );
  }

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
        <p className="text-xs text-white/80">
          走行結果の通知を受け取れます
        </p>
      </div>
    </button>
  );
}
