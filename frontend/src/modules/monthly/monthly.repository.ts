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
      },
      {
        onConflict: "user_id,target_month",
        ignoreDuplicates: true,
      }
    );
    if (error != null) throw new Error(error.message);
  },
};
