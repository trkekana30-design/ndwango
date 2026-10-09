import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatPrice, slugify } from "@/lib/format";
import {
  Loader2, Plus, Store, ImagePlus, Trash2, Edit, ExternalLink, Truck, Phone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/seller")({
  component: SellerPage,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  slogan: string | null;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  contact_name: string | null;
  whatsapp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  province: string | null;
  id_number: string | null;
};

type Product = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  stock: number;
  image_url: string | null;
  is_active: boolean;
};

type Zone = {
  id: string;
  name: string;
  areas: string | null;
  fee_cents: number;
  eta_days: number;
  is_active: boolean;
};

const PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

function SellerPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const { data: s } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setShop(s as Shop | null);
    if (s) {
      const [{ data: p }, { data: z }] = await Promise.all([
        supabase
          .from("products")
          .select("id,title,price_cents,currency,stock,image_url,is_active")
          .eq("shop_id", s.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("delivery_zones")
          .select("id,name,areas,fee_cents,eta_days,is_active")
          .eq("shop_id", s.id)
          .order("created_at", { ascending: true }),
      ]);
      setProducts(p ?? []);
      setZones((z as Zone[] | null) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {!shop ? (
          <CreateShop
            userId={user.id}
            userEmail={user.email ?? ""}
            onCreated={() => {
              toast.success("Your Khaya is open");
              loadAll();
            }}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Your Khaya</p>
                <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">{shop.name}</h1>
                {shop.slogan && <p className="text-sm text-muted-foreground">{shop.slogan}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/shop/$slug", params: { slug: shop.slug } })}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> View shop
                </Button>
                <ProductDialog
                  shopId={shop.id}
                  userId={user.id}
                  trigger={
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Plus className="mr-2 h-4 w-4" /> Add product
                    </Button>
                  }
                  onSaved={loadAll}
                />
              </div>
            </div>

            <ContactCard shop={shop} onSaved={loadAll} />
            <DeliveryCard shopId={shop.id} zones={zones} onChanged={loadAll} />

            <div>
              <h2 className="mb-4 font-display text-2xl">Products ({products.length})</h2>
              {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed py-16 text-center">
                  <p className="text-muted-foreground">You haven't listed anything yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-16">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{p.title}</p>
                          {!p.is_active && <Badge variant="outline">Hidden</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(p.price_cents, p.currency)} · {p.stock} in stock
                        </p>
                      </div>
                      <ProductDialog
                        shopId={shop.id}
                        userId={user.id}
                        existing={p}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                        onSaved={loadAll}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm("Delete this product?")) return;
                          const { error } = await supabase.from("products").delete().eq("id", p.id);
                          if (error) toast.error(error.message);
                          else {
                            toast.success("Deleted");
                            loadAll();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateShop({
  userId,
  userEmail,
  onCreated,
}: {
  userId: string;
  userEmail: string;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    if (!name) return;
    setSaving(true);
    const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    await supabase.from("user_roles").insert({ user_id: userId, role: "seller" }).select();
    const { error } = await supabase.from("shops").insert({
      owner_id: userId,
      name,
      slug,
      slogan: String(form.get("slogan") ?? "") || null,
      description: String(form.get("description") ?? "") || null,
      city: String(form.get("city") ?? "") || null,
      contact_name: String(form.get("contact_name") ?? "").trim() || null,
      whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      address: String(form.get("address") ?? "").trim() || null,
      province: String(form.get("province") ?? "").trim() || null,
      id_number: String(form.get("id_number") ?? "").trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onCreated();
  };
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Open your Khaya</h1>
        <p className="mt-2 text-muted-foreground">
          Register your shop. All contact details are shown to buyers so they can reach you.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <Section title="About your shop">
          <Field label="Shop name *">
            <Input name="name" required placeholder="e.g. Khaya Crafts" />
          </Field>
          <Field label="Slogan">
            <Input name="slogan" placeholder="A short tagline" />
          </Field>
          <Field label="About your shop" full>
            <Textarea name="description" rows={3} />
          </Field>
        </Section>

        <Section title="Contact — visible to buyers">
          <Field label="Full name *">
            <Input name="contact_name" required placeholder="Owner / point of contact" />
          </Field>
          <Field label="WhatsApp number *">
            <Input name="whatsapp" required placeholder="+27 82 000 0000" />
          </Field>
          <Field label="Email *">
            <Input name="email" type="email" required defaultValue={userEmail} />
          </Field>
          <Field label="Phone">
            <Input name="phone" placeholder="Landline / alt phone" />
          </Field>
        </Section>

        <Section title="Business address">
          <Field label="Address *" full>
            <Input name="address" required placeholder="Street & suburb" />
          </Field>
          <Field label="City *">
            <Input name="city" required placeholder="e.g. Johannesburg" />
          </Field>
          <Field label="Province *">
            <select
              name="province"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Select province</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Verification">
          <Field label="ID / business registration number *" full>
            <Input name="id_number" required placeholder="For verification only" />
          </Field>
        </Section>

        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open my shop"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You can add delivery zones and products right after.
        </p>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/" className="text-muted-foreground hover:text-accent">
          ← Back to marketplace
        </Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ContactCard({ shop, onSaved }: { shop: Shop; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("shops").update({
      contact_name: String(f.get("contact_name") ?? "").trim() || null,
      whatsapp: String(f.get("whatsapp") ?? "").trim() || null,
      email: String(f.get("email") ?? "").trim() || null,
      phone: String(f.get("phone") ?? "").trim() || null,
      address: String(f.get("address") ?? "").trim() || null,
      city: String(f.get("city") ?? "").trim() || null,
      province: String(f.get("province") ?? "").trim() || null,
    }).eq("id", shop.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contact updated");
    setEditing(false);
    onSaved();
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Buyer contact</p>
          <h2 className="font-display text-xl">How buyers reach you</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {!editing ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Contact name" value={shop.contact_name} />
          <Info label="WhatsApp" value={shop.whatsapp} />
          <Info label="Email" value={shop.email} />
          <Info label="Phone" value={shop.phone} />
          <Info label="Address" value={shop.address} />
          <Info label="City / Province" value={[shop.city, shop.province].filter(Boolean).join(", ") || null} />
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact name"><Input name="contact_name" defaultValue={shop.contact_name ?? ""} /></Field>
          <Field label="WhatsApp"><Input name="whatsapp" defaultValue={shop.whatsapp ?? ""} /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={shop.email ?? ""} /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={shop.phone ?? ""} /></Field>
          <Field label="Address" full><Input name="address" defaultValue={shop.address ?? ""} /></Field>
          <Field label="City"><Input name="city" defaultValue={shop.city ?? ""} /></Field>
          <Field label="Province">
            <select name="province" defaultValue={shop.province ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">—</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate">{value || <span className="italic text-muted-foreground">not set</span>}</p>
    </div>
  );
}

function DeliveryCard({
  shopId,
  zones,
  onChanged,
}: {
  shopId: string;
  zones: Zone[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const addZone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("delivery_zones").insert({
      shop_id: shopId,
      name: String(f.get("name") ?? "").trim(),
      areas: String(f.get("areas") ?? "").trim() || null,
      fee_cents: Math.round(Number(f.get("fee") ?? 0) * 100),
      eta_days: Number(f.get("eta") ?? 3),
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Delivery zone added");
    setAdding(false);
    onChanged();
    (e.target as HTMLFormElement).reset();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this delivery zone?")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  const toggle = async (z: Zone) => {
    const { error } = await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Delivery</p>
            <h2 className="font-display text-xl">Your delivery zones</h2>
          </div>
        </div>
        <Button size="sm" variant={adding ? "outline" : "default"} onClick={() => setAdding((v) => !v)}
          className={adding ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}
        >
          {adding ? "Cancel" : <><Plus className="mr-1 h-4 w-4" /> Add zone</>}
        </Button>
      </div>

      {adding && (
        <form onSubmit={addZone} className="mb-4 grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Zone name *</Label>
            <Input name="name" required placeholder="e.g. Johannesburg local" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Fee (R) *</Label>
            <Input name="fee" type="number" step="0.01" min={0} required defaultValue={0} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">ETA (days) *</Label>
            <Input name="eta" type="number" min={0} required defaultValue={3} />
          </div>
          <div className="sm:col-span-4">
            <Label className="mb-1 block text-xs">Areas covered</Label>
            <Input name="areas" placeholder="e.g. Sandton, Rosebank, Randburg" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add delivery zone"}
            </Button>
          </div>
        </form>
      )}

      {zones.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Add at least one delivery zone so buyers can check out.
        </p>
      ) : (
        <div className="grid gap-2">
          {zones.map((z) => (
            <div key={z.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{z.name}</p>
                  {!z.is_active && <Badge variant="outline">Off</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(z.fee_cents)} · {z.eta_days} day{z.eta_days === 1 ? "" : "s"}
                  {z.areas && ` · ${z.areas}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggle(z)}>
                {z.is_active ? "Disable" : "Enable"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(z.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDialog({
  shopId,
  userId,
  existing,
  trigger,
  onSaved,
}: {
  shopId: string;
  userId: string;
  existing?: Product;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.image_url ?? null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("marketplace-images")
      .upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("marketplace-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      shop_id: shopId,
      title: String(form.get("title")),
      description: String(form.get("description") ?? "") || null,
      price_cents: Math.round(Number(form.get("price")) * 100),
      currency: "ZAR",
      stock: Number(form.get("stock")),
      category: String(form.get("category") ?? "") || null,
      image_url: imageUrl,
      is_active: form.get("is_active") === "on",
    };
    setSaving(true);
    const { error } = existing
      ? await supabase.from("products").update(payload).eq("id", existing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(existing ? "Product updated" : "Product listed");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Photo</Label>
            <div className="flex items-start gap-3">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                  disabled={uploading}
                />
                {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required defaultValue={existing?.title} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price (ZAR) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={existing ? existing.price_cents / 100 : ""}
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                required
                defaultValue={existing?.stock ?? 1}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="e.g. Home decor" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={existing?.is_active ?? true}
              className="h-4 w-4"
            />
            List publicly
          </label>
          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={saving || uploading}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
