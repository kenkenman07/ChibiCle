import { supabase } from "../../lib/supabase";

export const monthlyRepository = {
  async find(userId: string, targetMonth: string) {
    const { data, error } = await supabase
      .from("monthly")
      .select()
      .eq("user_id", userId)
      .eq("targetMonth", targetMonth)
      .single();

    if (error != null) throw new Error(error.message);

    return data;
  },

  async insert(userId: string, targetMonth: string) {
    const { error } = await supabase.from("monthly").insert({
      user_id: userId,
      monthly_driving_times: 0,
      monthly_violation_times: 0,
      monthly_fines_amount: 0,
      target_month: targetMonth,
    });

    if (error != null) throw new Error(error.message);
  },
};
