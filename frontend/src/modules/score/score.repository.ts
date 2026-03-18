import { supabase } from "../../lib/supabase";
import type { ScoreJson } from "./score.entity";

export const scoreRepository = {
  async find(userId: string) {
    const { data, error } = await supabase
      .from("score")
      .select()
      .eq("user_id", userId)
      .single();

    if (error != null) throw new Error(error.message);

    return data;
  },

  async update(userId: string, score: ScoreJson) {
    const { error } = await supabase.from("score").upsert({
      user_id: userId,
      score: score,
      created_at: new Date().toISOString(),
    });
    if (error != null) throw new Error(error.message);
  },
};
