import { supabase } from "../../lib/supabase";
import type { ScoreJson } from "./score.entity";

export const scoreRepository = {
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

  async insert(userId: string, score: ScoreJson) {
    const { error } = await supabase.from("score").insert({
      user_id: userId,
      score: score,
    });
    if (error != null) throw new Error(error.message);
  },
};
