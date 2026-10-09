import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Crown, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askManager } from "@/lib/hq.functions";

export const Route = createFileRoute("/_authenticated/admin_/manager")({
  component: ManagerPage,
  head: () => ({
    meta: [
      { title: "Manager Agent — Ndwango HQ" },
      { name: "description", content: "Chat with the Ndwango Manager Agent about the whole platform." },
      { property: "og:title", content: "Manager Agent — Ndwango HQ" },
      { property: "og:description", content: "Ask what's wrong today and get the weekly report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = ["What's the biggest problem today?", "Give me the Ndwango weekly report", "Are we making money?", "Any fraud I should look at?"];

function ManagerPage() {
  const ask = useServerFn(askManager);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next); setInput(""); setBusy(true);
    try { const { reply } = await ask({ data: { messages: next.slice(-20) } }); setMsgs([...next, { role: "assistant", content: reply }]); }
    catch (e: any) { setMsgs([...next, { role: "assistant", content: `⚠️ ${e.message}` }]); }
    finally { setBusy(false); }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl flex items-center gap-2"><Crown className="h-5 w-5 text-primary" />Manager Agent</h1>
        <Button asChild variant="outline" size="sm"><Link to="/admin/agents"><LayoutGrid className="mr-2 h-4 w-4" />Agent board</Link></Button>
      </div>
      <div className="flex-1 space-y-3">
        {msgs.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm space-y-3">
            <p>I read every agent's report so you don't have to. Ask me anything about Ndwango.</p>
            <div className="flex flex-wrap gap-2">{SUGGEST.map((s) => <Button key={s} size="sm" variant="secondary" onClick={() => send(s)}>{s}</Button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-2 text-primary-foreground" : "max-w-[95%] rounded-xl border border-border bg-card px-4 py-3 prose prose-sm prose-invert max-w-none"}>
            {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
          </div>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
      <form className="sticky bottom-0 mt-4 flex gap-2 bg-background py-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="What's wrong today?"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button type="submit" disabled={busy}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
