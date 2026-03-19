import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function buildFlexMessage(
  score: {
    scorePercent: number;
    intersectionNumber: number;
    stoppedCount: number;
  },
  frontendUrl: string,
) {
  return {
    type: "flex",
    altText: `走行記録完了 - 安全スコア ${score.scorePercent}pt`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#126f50",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "ChibiCle",
            color: "#a5d6c5",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: "走行記録が完了しました",
            color: "#ffffff",
            size: "lg",
            weight: "bold",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: `${score.scorePercent}pt`,
            size: "3xl",
            weight: "bold",
            color: "#ff8652",
            align: "center",
          },
          {
            type: "text",
            text: "安全スコア",
            size: "xs",
            color: "#999999",
            align: "center",
            margin: "sm",
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  {
                    type: "text",
                    text: "交差点通過",
                    size: "xs",
                    color: "#999999",
                  },
                  {
                    type: "text",
                    text: `${score.intersectionNumber}箇所`,
                    size: "lg",
                    weight: "bold",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  {
                    type: "text",
                    text: "安全停止",
                    size: "xs",
                    color: "#48b98b",
                  },
                  {
                    type: "text",
                    text: `${score.stoppedCount}箇所`,
                    size: "lg",
                    weight: "bold",
                    color: "#48b98b",
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "結果を見る",
              uri: `${frontendUrl}/result`,
            },
            style: "primary",
            color: "#126f50",
          },
        ],
      },
    },
  };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ sent: false, reason: "missing_user_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: scoreData } = await supabase
      .from("score")
      .select("score, created_at")
      .eq("user_id", user_id)
      .single();

    if (!scoreData?.score) {
      return new Response(
        JSON.stringify({ sent: false, reason: "no_score" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: lineData } = await supabase
      .from("user_line")
      .select("line_id")
      .eq("user_id", user_id)
      .single();

    if (!lineData?.line_id) {
      return new Response(
        JSON.stringify({ sent: false, reason: "no_line_id" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const s = scoreData.score as {
      intersectionNumber: number;
      stoppedCount: number;
    };
    const scorePercent =
      s.intersectionNumber === 0
        ? 0
        : Math.round((s.stoppedCount / s.intersectionNumber) * 100);
    const score = {
      scorePercent,
      intersectionNumber: s.intersectionNumber,
      stoppedCount: s.stoppedCount,
    };
    const frontendUrl =
      Deno.env.get("FRONTEND_URL") ?? "https://localhost:5173";
    const flexMessage = buildFlexMessage(score, frontendUrl);

    const lineRes = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")}`,
        },
        body: JSON.stringify({
          to: lineData.line_id,
          messages: [flexMessage],
        }),
      },
    );

    if (!lineRes.ok) {
      const errBody = await lineRes.text();
      console.error("LINE API error:", lineRes.status, errBody);
      return new Response(
        JSON.stringify({ sent: false, reason: "line_api_error" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("notify-parent error:", e);
    return new Response(
      JSON.stringify({ sent: false, reason: "internal_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
