import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageSquareQuote } from "lucide-react";

type Review = {
  id: string;
  buyer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  buyer: { display_name: string | null } | null;
};

export function ProductReviews({
  productId,
  shopId,
  userId,
}: {
  productId: string;
  shopId: string;
  userId: string | null;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,buyer_id,rating,title,body,created_at,buyer:profiles(display_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setReviews((data as unknown as Review[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (!userId) {
      setCanReview(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id,order:orders!inner(buyer_id)")
        .eq("product_id", productId)
        .eq("orders.buyer_id", userId)
        .limit(1);
      setCanReview((data ?? []).length > 0);
    })();
  }, [userId, productId]);

  const mine = reviews.find((r) => r.buyer_id === userId);
  const average =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;
    const f = new FormData(e.currentTarget);
    setSaving(true);
    const payload = {
      product_id: productId,
      shop_id: shopId,
      buyer_id: userId,
      rating,
      title: String(f.get("title") ?? "").trim() || null,
      body: String(f.get("body") ?? "").trim() || null,
    };
    const { error } = mine
      ? await supabase.from("reviews").update(payload).eq("id", mine.id)
      : await supabase.from("reviews").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(mine ? "Review updated" : "Thanks for your review!");
    load();
  };

  return (
    <div className="mt-10 border-t pt-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={average} />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {canReview && (
        <form onSubmit={submit} className="mb-6 space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-medium">{mine ? "Edit your review" : "Write a review"}</p>
          <StarRating value={rating} size={24} onChange={setRating} />
          <div>
            <Label htmlFor="rv-title">Headline</Label>
            <Input id="rv-title" name="title" defaultValue={mine?.title ?? ""} placeholder="Love it!" />
          </div>
          <div>
            <Label htmlFor="rv-body">Your experience</Label>
            <Textarea id="rv-body" name="body" rows={3} defaultValue={mine?.body ?? ""} />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mine ? "Update review" : "Post review"}
          </Button>
        </form>
      )}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <MessageSquareQuote className="mx-auto mb-2 h-6 w-6" />
          No reviews yet — buyers can review after they order.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} />
                  <span className="text-sm font-medium">{r.buyer?.display_name ?? "Buyer"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.title && <p className="mt-2 font-medium">{r.title}</p>}
              {r.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
