import { User } from "lucide-react";

const Header = () => {
  return (
    <div className="bg-teal-700 px-6 pt-12 pb-6 rounded-b-3xl shadow-md text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">テスト ユーザー</h2>
          </div>
        </div>
        <div className="px-3 py-1 bg-teal-600 rounded-full text-xs font-medium flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          Online
        </div>
      </div>
    </div>
  );
};
export default Header;
