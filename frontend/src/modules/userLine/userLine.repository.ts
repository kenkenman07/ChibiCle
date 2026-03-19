import { supabase } from "../../lib/supabase";

export const userLineRepository = {
  async insert(userId: string, lineId: string) {
    const { error } = await supabase.from("user_line").upsert(
      {
        user_id: userId,
        line_id: lineId,
      },
      {
        onConflict: "user_id",
      }
    );
    if (error) throw new Error(error.message);
  },

  async find(userId: string) {
    const { data, error } = await supabase
      .from("user_line")
      .select()
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null;
    return data;
  },
};
