import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Loader2, Mail, Phone, Sparkles, User as UserIcon, Inbox, LifeBuoy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

type Lead = {
  id: string;
  type: "inquiry" | "support";
  subject: string | null;
  interest: string;
  ai_summary: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  budget_cents: number | null;
  status: "new" | "contacted" | "won" | "lost";
  source: string;
  created_at: string;
  shop_id: string | null;
  product: { id: string; title: string } | null;
};

const STATUSES: Lead["status"][] = ["new", "contacted", "won", "lost"];

const statusStyles: Record<Lead["status"], string> = {
  new: "bg-accent/15 text-accent border-accent/30",
  contacted: "bg-primary/10 text-primary border-primary/20",
  won: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  lost: "bg-muted text-muted-foreground border-muted-foreground/20",
};

function LeadsPage() {
  const { user } = Route.useRouteContext();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"inquiry" | "support">("inquiry");
  const [filter, setFilter] = useState<Lead["status"] | "all">("all");

  const load = async () => {
    const { data } = await supabase
      .from("leads")
      .select(
        "id,type,subject,interest,ai_summary,name,email,phone,budget_cents,status,source,created_at,shop_id,product:products(id,title)",
      )
      .order("created_at", { ascending: false });
    setLeads((data as Lead[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const setStatus = async (id: string, status: Lead["status"]) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const inTab = leads.filter((l) => (l.type ?? "inquiry") === tab);
  const filtered = filter === "all" ? inTab : inTab.filter((l) => l.status === filter);
  const inquiryCount = leads.filter((l) => (l.type ?? "inquiry") === "inquiry").length;
  const supportCount = leads.filter((l) => l.type === "support").length;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-widest text-accent">
            <Sparkles className="h-3 w-3" /> Seller inbox
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Leads & Support</h1>
          <p className="text-sm text-muted-foreground">
            Shoppers the AI concierge qualifies for you, plus product issues escalated to your Khaya.
          </p>
        </div>

        <div className="mb-4 flex gap-2 border-b">
          {[
            { key: "inquiry" as const, icon: MessageCircle, label: "Inquiries", count: inquiryCount },
            { key: "support" as const, icon: LifeBuoy, label: "Support tickets", count: supportCount },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setFilter("all"); }}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label} <span className="text-xs opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({inTab.length})
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
              className="capitalize"
            >
              {s} ({inTab.filter((l) => l.status === s).length})
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <Inbox className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-xl">
              {tab === "support" ? "No support tickets" : "No leads yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "support"
                ? "Buyer issues from the product pages and AI concierge will appear here."
                : "When shoppers show interest, the AI receptionist will drop them here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((lead) => (
              <div key={lead.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {lead.type === "support" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
                        <LifeBuoy className="h-3 w-3" /> Support
                      </span>
                    )}
                    <p className="font-display text-lg leading-tight">
                      {lead.subject ?? lead.name ?? "Anonymous shopper"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{lead.interest}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 capitalize ${statusStyles[lead.status]}`}>
                    {lead.status}
                  </Badge>
                </div>

                {lead.ai_summary && (
                  <div className="mt-3 rounded-lg border-l-2 border-accent bg-accent/5 p-2 text-xs italic text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3 text-accent" />
                    {lead.ai_summary}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {lead.name && lead.subject && (
                    <span className="flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> {lead.name}</span>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-accent">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </a>
                  )}
                  {lead.budget_cents != null && (
                    <span className="flex items-center gap-1.5">
                      Budget: {formatPrice(lead.budget_cents)}
                    </span>
                  )}
                  {lead.product && <span className="truncate">re: {lead.product.title}</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(lead.created_at).toLocaleString()}
                  </span>
                  <div className="flex gap-1">
                    {STATUSES.filter((s) => s !== lead.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs capitalize"
                        onClick={() => setStatus(lead.id, s)}
                      >
                        → {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
