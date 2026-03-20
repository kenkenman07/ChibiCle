import { Bike, ShieldCheck } from "lucide-react";

type ScoreProps = {
  monthlyScore: number | null;
  monthlyDrivingTimes: number | null;
};

const ScoreContent = ({ monthlyScore, monthlyDrivingTimes }: ScoreProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="bg-[#ff8652] rounded-3xl p-5 text-white shadow-lg shadow-orange-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-white/20 w-16 h-16 rounded-bl-full" />
        <div className="flex justify-between items-start mb-6">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="text-3xl font-bold mb-1">
          {monthlyScore}
          <span className="text-sm font-normal opacity-80 ml-1">pt</span>
        </div>
        <div className="text-sm font-medium">安全スコア</div>
      </div>

      <div className="bg-[#7c83f5] rounded-3xl p-5 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#21247d]/20 w-16 h-16 rounded-bl-full" />
        <div className="flex justify-between items-start mb-6">
          <Bike className="w-6 h-6" />
        </div>
        <div className="text-3xl font-bold mb-1">
          {monthlyDrivingTimes}
          <span className="text-sm font-normal opacity-80 ml-1">回</span>
        </div>
        <div className="text-sm font-medium">走行回数</div>
      </div>
    </div>
  );
};
export default ScoreContent;
