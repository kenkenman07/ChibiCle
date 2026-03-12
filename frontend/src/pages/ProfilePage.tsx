import { useNavigate } from "react-router-dom";
import { ChevronRight, User, Mail, LogOut } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";

const ProfilePage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 実際のアプリではここで認証解除処理を行います
    navigate("/");
  };

  return (
    <ScreenWrapper>
      {/* ヘッダー */}
      <div className="bg-teal-700 text-white px-4 py-4 shadow-md z-10 flex items-center mt-8">
        <button onClick={() => navigate(-1)} className="p-2 mr-2">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h2 className="text-lg font-bold">プロフィール</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col">
        {/* プロフィールアイコンと名前 */}
        <div className="flex flex-col items-center mt-6 mb-8">
          <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 shadow-sm border-4 border-white">
            <User className="w-12 h-12 text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">テスト ユーザー</h3>
        </div>

        {/* ユーザー情報リスト */}
        <div className="space-y-4 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <div className="bg-slate-50 p-3 rounded-xl mr-4">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">名前</p>
              <p className="font-semibold text-slate-800">テスト ユーザー</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <div className="bg-slate-50 p-3 rounded-xl mr-4">
              <Mail className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">メールアドレス</p>
              <p className="font-semibold text-slate-800">
                test.user@example.com
              </p>
            </div>
          </div>
        </div>

        {/* ログアウトボタン */}
        <div className="mt-auto pt-6">
          <button
            onClick={handleLogout}
            className="w-full bg-white border border-red-100 hover:bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center shadow-sm transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            ログアウト
          </button>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default ProfilePage;
