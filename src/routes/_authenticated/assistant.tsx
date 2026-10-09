import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, Sparkles, Trash2, Lock, TrendingUp, Users, Wallet, PenLine, Crown, RefreshCw, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getBusinessScope,
  getBusinessHistory,
  sendBusinessMessage,
  clearBusinessHistory,
  claimFirstAdmin,
} from "@/lib/business-assistant.functions";
import { runCouncilReport, listCouncilReports, deleteCouncilReport } from "@/lib/council.functions";
import { TEAMS } from "@/lib/agent-teams";

type UIMsg = { id: string; role: "user" | "assistant"; content: string };
type CouncilReport = {
  id: string;
  title: string;
  summary_md: string;
  sections: Record<string, string>;
  period_days: number;
  created_at: string;
  scope: "owner" | "seller";
};

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
  loader: async () => {
    const info = await getBusinessScope();
    return info;
  },
  head: () => ({
    meta: [
      { title: "King Kotini — Ndwango" },
      { name: "description", content: "Your private AI strategist for sales, customers, money, and content." },
    ],
  }),
});

const OWNER_PROMPTS = [
  "How are sales trending this month?",
  "Give me a WhatsApp campaign for repeat buyers.",
  "Show me the top-earning shops and product categories.",
  "Draft 3 Instagram captions for our summer drop.",
];

const SELLER_PROMPTS = [
  "How is my shop performing this month?",
  "Write a product description for my top seller.",
  "Which of my products need a promo?",
  "Draft a WhatsApp broadcast to my past buyers.",
];

function AssistantPage() {
  const info = Route.useLoaderData();
  const [claiming, setClaiming] = useState(false);
  const [localScope, setLocalScope] = useState(info);
  const claim = useServerFn(claimFirstAdmin);

  if (!localScope.hasAccess) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-3xl">King Kotini</h1>
        {localScope.canClaimAdmin ? (
          <>
            <p className="mt-2 max-w-md text-muted-foreground">
              No platform owner has claimed Ndwango yet. Claim ownership now to unlock the private King Kotini —
              only you will see it.
            </p>
            <Button
              className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                try {
                  await claim();
                  setLocalScope({ scope: "owner", hasAccess: true, canClaimAdmin: false });
                  toast.success("You are now the Ndwango platform owner.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not claim ownership.");
                } finally {
                  setClaiming(false);
                }
              }}
            >
              {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Claim platform ownership
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 max-w-md text-muted-foreground">
              King Kotini for sellers is available once you open your Khaya (shop). It will be private to you and
              scoped only to your own products and customers.
            </p>
            <Button asChild className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/seller">Open my Khaya</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  return <Chat scope={localScope.scope} />;
}

function Chat({ scope }: { scope: "owner" | "seller" }) {
  const isOwner = scope === "owner";
  const [messages, setMessages] = useState<UIMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadHistory = useServerFn(getBusinessHistory);
  const send = useServerFn(sendBusinessMessage);
  const clear = useServerFn(clearBusinessHistory);

  useEffect(() => {
    setLoadingHistory(true);
    loadHistory({ data: { scope } })
      .then((rows) => {
        setMessages(
          rows
            .filter((r) => r.role === "user" || r.role === "assistant")
            .map((r) => ({ id: r.id, role: r.role as "user" | "assistant", content: r.content })),
        );
      })
      .catch(() => {})
      .finally(() => {
        setLoadingHistory(false);
        inputRef.current?.focus();
      });
  }, [scope, loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (!loading) inputRef.current?.focus();
  }, [messages, loading]);

  const submit = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "user", content: value }]);
    setLoading(true);
    try {
      const res = await send({ data: { text: value, scope } });
      setMessages((m) => [...m, { id: `a_${Date.now()}`, role: "assistant", content: res.text }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    await clear({ data: { scope } });
    setMessages([]);
  };

  const prompts = isOwner ? OWNER_PROMPTS : SELLER_PROMPTS;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-4 rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.2_0.11_265)] p-5 text-primary-foreground shadow-elegant sm:p-6">
        <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl leading-tight sm:text-3xl">
                      {isOwner ? "King Kotini" : "King Kotini"}
                    </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-crown">
                  <Lock className="h-3 w-3" /> Private
                </span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/80">
                {isOwner
                  ? "Sales, customers, accounting and content — for the platform, only you."
                  : "Your private coach — knows only your shop and products."}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={clearAll}
              size="sm"
              variant="ghost"
              className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {/* Pillars */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: TrendingUp, label: "Sales & marketing" },
            { icon: Users, label: "Customers" },
            { icon: Wallet, label: "Money" },
            { icon: PenLine, label: "Content" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2 text-xs">
              <Icon className="h-3.5 w-3.5 text-crown" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs: Chat vs Council */}
      <Tabs defaultValue="chat" className="flex flex-1 flex-col">
        <TabsList className="mb-3 grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="chat" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="council" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Council
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-elegant">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-secondary/30 px-3 py-4 sm:px-6">
              {loadingHistory ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto max-w-xl py-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="font-display text-xl">
                    {isOwner ? "What shall we work on today?" : "Let's grow your Khaya."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ask anything. I'll pull live numbers from your {isOwner ? "platform" : "shop"} before answering.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => submit(p)}
                        className="rounded-xl border bg-background px-4 py-3 text-left text-sm transition hover:border-accent hover:text-accent"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[80%]",
                        m.role === "user"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "prose prose-sm max-w-none rounded-bl-sm border bg-background text-foreground dark:prose-invert",
                      )}
                    >
                      {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                    </span>
                    Crunching numbers…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t bg-background p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={
                    isOwner
                      ? "Ask about platform sales, customers, money, or draft content…"
                      : "Ask about your shop, customers, takings, or draft content…"
                  }
                  rows={1}
                  className="max-h-40 min-h-[44px] resize-none"
                  disabled={loading}
                />
                <Button
                  onClick={() => submit()}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="h-11 w-11 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" />
                Confidential — only you can see this conversation.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="council" className="flex-1">
          <CouncilPanel isOwner={isOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CouncilPanel({ isOwner }: { isOwner: boolean }) {
  const [reports, setReports] = useState<CouncilReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const list = useServerFn(listCouncilReports);
  const run = useServerFn(runCouncilReport);
  const del = useServerFn(deleteCouncilReport);

  useEffect(() => {
    list()
      .then((r) => {
        setReports(r);
        setOpenId(r[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [list]);

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await run({ data: { days } });
      if (r) {
        setReports((prev) => [r as CouncilReport, ...prev]);
        setOpenId((r as CouncilReport).id);
        toast.success("Council briefing ready.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Council failed");
    } finally {
      setRunning(false);
    }
  };

  const remove = async (id: string) => {
    await del({ data: { id } });
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
  };

  const team = TEAMS[isOwner ? "owner" : "seller"];
  const AGENTS = team.agents.map((a) => ({ ...a, icon: Sparkles }));

  const open = reports.find((r) => r.id === openId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Left: run + list */}
      <div className="space-y-3">
        <div className="rounded-2xl border bg-background p-4 shadow-elegant">
          <h3 className="font-display text-lg">Run the Council</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {team.leader.label} delegates to {team.agents.map((a) => a.label).join(", ")}, then compiles your briefing.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              disabled={running}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button
              onClick={runNow}
              disabled={running}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Crown className="mr-1.5 h-4 w-4" />}
              Run
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Tip: run it every Monday morning for your weekly plan.
          </p>
        </div>

        {[team.leader, ...team.agents].some((a) => a.tasks?.length) && (
          <div className="rounded-2xl border bg-background p-2 shadow-elegant">
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your team & their limits
            </div>
            {[team.leader, ...team.agents].map((a) => (
              <details key={a.key} className="rounded-lg px-2 py-1.5 text-xs">
                <summary className="cursor-pointer font-medium">{a.label}</summary>
                <p className="mt-1 text-muted-foreground">{a.mission}</p>
                {a.tasks && (
                  <ul className="mt-1 list-disc pl-4">{a.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
                )}
                {a.boundaries && (
                  <ul className="mt-1 list-disc pl-4 text-destructive">{a.boundaries.map((t) => <li key={t}>{t}</li>)}</ul>
                )}
              </details>
            ))}
          </div>
        )}

        <div className="rounded-2xl border bg-background p-2 shadow-elegant">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past briefings
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-accent" /></div>
          ) : reports.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">No briefings yet.</div>
          ) : (
            <ul className="space-y-1">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setOpenId(r.id)}
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-left text-xs transition hover:bg-secondary",
                      openId === r.id && "bg-secondary",
                    )}
                  >
                    <div className="font-medium">{new Date(r.created_at).toLocaleDateString()}</div>
                    <div className="truncate text-muted-foreground">Last {r.period_days} days</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: report */}
      <div className="rounded-2xl border bg-background p-4 shadow-elegant sm:p-6">
        {!open ? (
          <div className="grid place-items-center py-20 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Crown className="h-6 w-6" />
            </div>
            <p className="mt-3 font-display text-xl">Your Council awaits</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Hit <strong>Run</strong>. Your {team.name} ({team.agents.length} agents) will study your {isOwner ? "platform" : "shop"} and
              your {team.leader.label} will hand you a plan for the week.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{open.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(open.created_at).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(open.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="prose prose-sm mt-4 max-w-none rounded-xl border bg-secondary/40 p-4 dark:prose-invert">
              <ReactMarkdown>{open.summary_md}</ReactMarkdown>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="font-display text-lg">Specialist reports</h3>
              {AGENTS.map(({ key, label, icon: Icon }) => {
                const body = open.sections?.[key];
                if (!body) return null;
                return (
                  <details key={key} className="group rounded-xl border bg-background">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-accent" /> {label} agent
                      </span>
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>
                    <div className="prose prose-sm max-w-none border-t px-4 py-3 dark:prose-invert">
                      <ReactMarkdown>{body}</ReactMarkdown>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
