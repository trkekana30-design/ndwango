import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, X, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import {
  getReceptionistHistory,
  sendReceptionistMessage,
  clearReceptionistHistory,
  type Recommendation,
} from "@/lib/receptionist.functions";
import { toast } from "sonner";

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
};

export function AIReceptionist() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadHistory = useServerFn(getReceptionistHistory);
  const sendMessage = useServerFn(sendReceptionistMessage);
  const clearHistory = useServerFn(clearReceptionistHistory);

  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;
    setLoadingHistory(true);
    loadHistory()
      .then((rows) => {
        setMessages(
          rows
            .filter((r) => r.role === "user" || r.role === "assistant")
            .map((r) => ({ id: r.id, role: r.role as "user" | "assistant", content: r.content })),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [open, loadHistory, messages.length]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (!loading) inputRef.current?.focus();
  }, [messages, open, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: UIMessage = { id: `u_${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const res = await sendMessage({ data: { text } });
      setMessages((m) => [
        ...m,
        { id: `a_${Date.now()}`, role: "assistant", content: res.text, recommendations: res.recommendations },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setMessages((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: "Sorry — I hit a snag reaching my brain. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    await clearHistory();
    setMessages([]);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Ndwango receptionist"
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-accent to-[oklch(0.4_0.19_10)] text-accent-foreground shadow-2xl",
          "transition-all hover:scale-105 active:scale-95",
          "ring-4 ring-accent/20",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crown opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-crown" />
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
            "inset-x-3 bottom-24 sm:bottom-24 sm:right-5 sm:left-auto sm:w-[400px]",
            "max-h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-primary to-[oklch(0.2_0.11_265)] px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-base leading-tight">Ndwango Receptionist</p>
                <p className="text-[11px] uppercase tracking-widest text-crown">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  onClick={clearAll}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => setOpen(false)}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-secondary/30 px-4 py-4">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="pt-6 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="font-display text-lg">Sanibonani 👋</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  I'm your Ndwango concierge. Tell me what you're looking for and I'll find local
                  brands that can help.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "Show me handmade ceramics",
                    "I need kitchen essentials",
                    "Connect me with a local seller",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border bg-background px-3 py-1 text-xs hover:border-accent hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] space-y-2", m.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm border bg-background text-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                    {m.recommendations && m.recommendations.length > 0 && (
                      <div className="space-y-2">
                        {m.recommendations.map((r) => (
                          <Link
                            key={r.id}
                            to="/product/$id"
                            params={{ id: r.id }}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-xl border bg-background p-2 hover:border-accent"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {r.image_url && (
                                <img
                                  src={r.image_url}
                                  alt={r.title}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{r.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.shop_name ?? "Ndwango"}
                              </p>
                              <p className="text-sm font-semibold text-accent">
                                {formatPrice(r.price_cents, r.currency)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-background px-3.5 py-2 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                  </span>
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-background p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about products, sellers, or bookings…"
                rows={1}
                className="max-h-32 min-h-[40px] resize-none"
                disabled={loading}
              />
              <Button
                onClick={send}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Powered by Lovable AI · Conversations are saved to your account
            </p>
          </div>
        </div>
      )}
    </>
  );
}
