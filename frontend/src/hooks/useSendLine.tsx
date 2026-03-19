import { supabase } from "../lib/supabase";
import { useCurrentUserStore } from "../modules/auth/current-user.state";

const useSendLine = () => {
  const { currentUser } = useCurrentUserStore();

  const sendLine = async () => {
    if (!currentUser) return;
    const { error } = await supabase.functions.invoke("notify-parent", {
      body: { user_id: currentUser.id },
    });

    if (error != null) throw new Error(error.message);
  };

  return { sendLine };
};

export default useSendLine;
