import { supabase } from "../../lib/supabase";

export const monthlyRepository = {
  async find(userId: string, nowMonth: string) {
    const { data, error } = await supabase
      .from("monthly")
      .select()
      .eq("user_id", userId)
      .eq("target_month", nowMonth)
      .maybeSingle();

    if (error != null) throw new Error(error.message);

    return data;
  },

  async insert(userId: string, nowMonth: string) {
    const { error } = await supabase.from("monthly").upsert(
      {
        user_id: userId,
        target_month: nowMonth,
        monthly_driving_times: 0,
        monthly_safety_times: 0,
        monthly_score: 0,
      },
      {
        onConflict: "user_id,target_month",
        ignoreDuplicates: true,
      }
    );
    if (error != null) throw new Error(error.message);
  },

  async update(
    userId: string,
    nowMonth: string,
    driving_times: number,
    safety_times: number,
    score: number
  ) {
    const { error } = await supabase.rpc("increment_monthly", {
      p_user_id: userId,
      p_target_month: nowMonth,
      p_driving_times: driving_times,
      p_safety_times: safety_times,
      p_score: score,
    });

    if (error != null) throw new Error(error.message);
  },
};
