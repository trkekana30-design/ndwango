import { createFileRoute } from "@tanstack/react-router";

// Called every 4 hours by the scheduler. Verified with a secret token stored in the database.
export const Route = createFileRoute("/api/public/hooks/hq-agents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-hq-token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: job } = await supabaseAdmin.from("hq_job").select("*").eq("id", 1).maybeSingle();
        if (!job || !token || token !== job.cron_token) return new Response("Unauthorized", { status: 401 });
        // single-flight lock
        const now = new Date();
        if (job.locked_until && new Date(job.locked_until) > now) return Response.json({ skipped: "already running" });
        await supabaseAdmin.from("hq_job").update({ locked_until: new Date(now.getTime() + 10 * 60_000).toISOString() }).eq("id", 1);
        try {
          const { runAllAgents } = await import("@/lib/hq-agents.server");
          await runAllAgents({ siteUrl: new URL(request.url).origin });
          return Response.json({ ok: true });
        } finally {
          await supabaseAdmin.from("hq_job").update({ locked_until: null, last_run: new Date().toISOString() }).eq("id", 1);
        }
      },
    },
  },
});
