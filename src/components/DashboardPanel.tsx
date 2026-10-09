import { useMemo } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SeriesOrder = { status: string; total_cents: number; created_at: string };
export type Kpi = { label: string; value: string; hint?: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--muted-foreground)",
  confirmed: "var(--primary)",
  shipped: "var(--ring)",
  delivered: "var(--accent)",
  cancelled: "var(--destructive)",
};
const rand = (c: number) => `R${Math.round(c / 100).toLocaleString("en-ZA")}`;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="h-4 w-1 rounded-full bg-accent" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DashboardPanel({ title, subtitle, kpis, orders }: { title: string; subtitle?: string; kpis: Kpi[]; orders: SeriesOrder[] }) {
  const { week, month, statuses } = useMemo(() => {
    const now = new Date();
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (n - 1 - i));
        return { key: dayKey(d), label: d.toLocaleDateString("en-ZA", n <= 7 ? { weekday: "short" } : { day: "numeric", month: "short" }), orders: 0, revenue: 0 };
      });
    const week = mk(7), month = mk(30);
    const wm = new Map(week.map((d) => [d.key, d])), mm = new Map(month.map((d) => [d.key, d]));
    const st = new Map<string, number>();
    for (const o of orders) {
      st.set(o.status, (st.get(o.status) ?? 0) + 1);
      if (o.status === "cancelled") continue;
      const k = o.created_at.slice(0, 10);
      const w = wm.get(k); if (w) { w.orders++; w.revenue += o.total_cents / 100; }
      const m = mm.get(k); if (m) { m.orders++; m.revenue += o.total_cents / 100; }
    }
    return { week, month, statuses: [...st.entries()].map(([name, value]) => ({ name, value })) };
  }, [orders]);
  const total = statuses.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          {subtitle && <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">● Live</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-bold">{k.value}</div>
            {k.hint && <div className="mt-1 font-mono text-[11px] text-muted-foreground">↑ {k.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Orders by day (7 days)" className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={week}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Order status breakdown">
          {total ? (
            <div className="flex items-center gap-3">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statuses} dataKey="value" innerRadius={42} outerRadius={64} stroke="none">
                      {statuses.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "var(--muted)"} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-xs">
                {statuses.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                    {s.name} — {Math.round((s.value / total) * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="py-12 text-center text-sm text-muted-foreground">No orders yet</p>}
        </Panel>
      </div>

      <Panel title="Revenue trend (30 days)">
        <div className="h-52">
          <ResponsiveContainer>
            <LineChart data={month}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} width={48} stroke="currentColor" className="text-muted-foreground" tickFormatter={(v) => `R${v}`} />
              <Tooltip formatter={(v: number) => rand(v * 100)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
