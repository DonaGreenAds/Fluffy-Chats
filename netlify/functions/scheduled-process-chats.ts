// Netlify Scheduled Function - Runs every 1 minute
export default async (req: Request) => {
  try {
    const { next_run } = await req.json();
    console.log(`[Netlify Cron] Starting scheduled chat processing... Next run: ${next_run}`);

    // Call the process-chats API endpoint
    const baseUrl = process.env.SITE_URL || process.env.URL || process.env.DEPLOY_URL || "https://fluffychats.telinfy.ai";
    const cronSecret = process.env.CRON_SECRET;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authorization header if CRON_SECRET is configured
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }

    const response = await fetch(`${baseUrl}/api/process-chats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Process-chats failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("[Netlify Cron] Success:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Netlify Cron] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  schedule: "* * * * *", // Every 1 minute
};
