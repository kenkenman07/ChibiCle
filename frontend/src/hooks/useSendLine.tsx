import { supabase } from "../lib/supabase";

import { useCurrentUserStore } from "../modules/auth/current-user.state";

const useSendLine = () => {
  const { currentUser } = useCurrentUserStore();

  const sendLine = async () => {
    if (!currentUser) return;

    const data = await supabase.auth.getSession();

    const { error } = await supabase.functions.invoke("notify-parent", {
      body: { user_id: currentUser.id },
      headers: {
        Authorization: `Bearer ${data.data.session?.access_token}`,
      },
    });

    if (error != null) throw new Error(error.message);
  };

  return { sendLine };
};

export default useSendLine;
