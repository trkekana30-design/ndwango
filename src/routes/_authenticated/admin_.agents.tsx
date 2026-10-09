import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, MessageSquare, Activity, Wallet, ShieldCheck, TrendingUp, Megaphone, Crown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAgentDashboard, runAgentsNow, updateFlag, addExpense, deleteExpense } from "@/lib/hq.functions";

export const Route = createFileRoute("/_authenticated/admin_/agents")({
  component: AgentsPage,
  head: () => ({
    meta: [
      { title: "HQ Agents — Ndwango" },
      { name: "description", content: "Owner-only status board for the Ndwango HQ agent team." },
      { property: "og:title", content: "HQ Agents — Ndwango" },
      { property: "og:description", content: "Platform Health, Finance, Trust & Safety, Growth and Marketing agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const AGENTS = [
  { key: "manager", label: "Manager", icon: Crown },
  { key: "platform_health", label: "Platform Health", icon: Activity },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "trust_safety", label: "Trust & Safety", icon: ShieldCheck },
  { key: "growth", label: "Growth", icon: TrendingUp },
  { key: "marketing", label: "Marketing", icon: Megaphone },
];
const dot = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500" } as Record<string, string>;
const rand = (c: number) => `R${(c / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" }) : "never");

function metricText(v: any): string {
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ") : "—";
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AgentsPage() {
  const load = useServerFn(getAgentDashboard);
  const run = useServerFn(runAgentsNow);
  const setFlag = useServerFn(updateFlag);
  const addExp = useServerFn(addExpense);
  const delExp = useServerFn(deleteExpense);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAgentDashboard>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [exp, setExp] = useState({ label: "", category: "hosting", amount: "" });

  const refresh = useCallback(() => load().then(setData).catch((e) => setErr(e.message)), [load]);
  useEffect(() => { refresh(); }, [refresh]);

  const runNow = async (only?: string) => {
    setRunning(only ?? "all");
    try { await run({ data: { only, origin: window.location.origin } }); toast.success("Check complete"); await refresh(); }
    catch (e: any) { toast.error(e.message); }
    finally { setRunning(null); }
  };

  if (err) return <div className="container mx-auto p-6 text-center text-muted-foreground">{err}</div>;
  if (!data) return <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const byKey = new Map(data.status.map((s) => [s.agent_name, s]));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Ndwango HQ Agents</h1>
          <p className="text-sm text-muted-foreground">Checks run automatically every 4 hours. Agents flag and recommend — they never delete data, move money, ban anyone or spend.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin/manager"><MessageSquare className="mr-2 h-4 w-4" />Talk to Manager</Link></Button>
          <Button onClick={() => runNow()} disabled={!!running}>
            {running === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Run check now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map(({ key, label, icon: Icon }) => {
          const s = byKey.get(key);
          const issues = (s?.issues ?? []) as any[];
          const actions = (s?.actions ?? []) as string[];
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{label}</div>
                <span className={`h-3 w-3 rounded-full ${dot[s?.status ?? ""] ?? "bg-muted"}`} title={s?.status ?? "not run"} />
              </div>
              <div className="text-xs text-muted-foreground">Last check: {when(s?.last_check)}</div>
              <div>
                <div className="text-xs font-medium mb-1">Issues found ({issues.length})</div>
                {issues.length ? (
                  <ul className="space-y-1 text-sm">
                    {issues.slice(0, 5).map((i, n) => (
                      <li key={n} className="flex gap-2"><Badge variant={i.level === "p1" ? "destructive" : "secondary"} className="h-5 shrink-0 uppercase">{i.level}</Badge><span>{i.text}</span></li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">{s ? "All clear" : "Not run yet"}</p>}
              </div>
              {actions.length > 0 && <div className="text-xs"><span className="font-medium">Actions taken:</span> {actions.join("; ")}</div>}
              {key !== "manager" && (
                <Button size="sm" variant="ghost" className="w-full" disabled={!!running} onClick={() => runNow(key)}>
                  {running === key ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}Re-check
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="details">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="details">Agent numbers</TabsTrigger>
          <TabsTrigger value="flags">Moderation queue ({data.flags.filter((f) => f.status === "open").length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="log">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid gap-4 md:grid-cols-2">
          {AGENTS.filter((a) => a.key !== "manager").map(({ key, label }) => {
            const m = (byKey.get(key)?.metrics ?? {}) as Record<string, any>;
            return (
              <div key={key} className="rounded-xl border border-border bg-card p-4">
                <div className="font-semibold mb-2">{label}</div>
                <dl className="grid grid-cols-1 gap-1 text-sm">
                  {Object.entries(m).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-border/50 py-1">
                      <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right break-all">{/_(30d|cents)$/.test(k) && typeof v === "number" ? rand(v) : metricText(v)}</dd>
                    </div>
                  ))}
                  {!Object.keys(m).length && <p className="text-muted-foreground">Run a check to see numbers.</p>}
                </dl>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="flags" className="space-y-2">
          <p className="text-sm text-muted-foreground">Flags are never automatic bans. Review high-risk cases yourself; sellers can appeal.</p>
          {data.flags.length === 0 && <p className="text-sm text-muted-foreground">No cases.</p>}
          {data.flags.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={f.risk === "high" ? "destructive" : "secondary"} className="uppercase">{f.risk}</Badge>
                  <span className="text-xs text-muted-foreground">{f.subject_type} · {when(f.created_at)}</span>
                  <Badge variant="outline">{f.status}</Badge>
                </div>
                <div className="text-sm mt-1">{f.reason}</div>
                {f.evidence && <div className="text-xs text-muted-foreground break-all">Evidence: {JSON.stringify(f.evidence)}</div>}
              </div>
              <div className="flex gap-1 flex-wrap">
                {["reviewing", "dismissed", "suspended", "resolved"].map((st) => (
                  <Button key={st} size="sm" variant="outline" disabled={f.status === st}
                    onClick={async () => { try { await setFlag({ data: { id: f.id, status: st } }); refresh(); } catch (e: any) { toast.error(e.message); } }}>
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-3">
          <p className="text-sm text-muted-foreground">Add your running costs (hosting, SMS, salaries) so the Finance agent can calculate real profit.</p>
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            try { await addExp({ data: { label: exp.label, category: exp.category, amount: Number(exp.amount) } }); setExp({ ...exp, label: "", amount: "" }); toast.success("Expense added"); refresh(); }
            catch (er: any) { toast.error(er.message); }
          }}>
            <Input className="w-48" placeholder="What (e.g. Hosting)" value={exp.label} onChange={(e) => setExp({ ...exp, label: e.target.value })} required />
            <select className="rounded-md border border-input bg-background px-3 text-sm" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>
              {["hosting", "sms", "marketing", "salaries", "payment_fees", "other"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <Input className="w-32" type="number" step="0.01" min="0" placeholder="Rand" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} required />
            <Button type="submit">Add</Button>
          </form>
          {data.expenses.map((x) => (
            <div key={x.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span>{x.spent_on} · {x.label} <span className="text-muted-foreground">({x.category})</span></span>
              <span className="flex items-center gap-2">{rand(x.amount_cents)}
                <Button size="icon" variant="ghost" onClick={async () => { await delExp({ data: { id: x.id } }); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="log" className="space-y-1">
          {data.logs.map((l) => (
            <div key={l.id} className="flex gap-3 rounded border border-border/60 bg-card px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground shrink-0 w-28">{when(l.created_at)}</span>
              <span className="font-medium shrink-0 w-28">{l.agent_name}</span>
              <span className="min-w-0">{l.action}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
