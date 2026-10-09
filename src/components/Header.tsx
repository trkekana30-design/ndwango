import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Store, User as UserIcon, LogOut, Package, Menu, Inbox, Sparkles, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }
    const load = () =>
      supabase
        .from("cart_items")
        .select("quantity", { count: "exact" })
        .eq("user_id", user.id)
        .then(({ data }) => setCartCount((data ?? []).reduce((s, r) => s + r.quantity, 0)));
    load();
    const channel = supabase
      .channel("cart-header")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:gap-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Logo className="h-10 w-auto shrink-0 sm:h-11" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-lg font-semibold text-primary sm:text-xl">
              Ndwango
            </div>
            <div className="hidden text-[10px] uppercase tracking-[0.2em] text-accent sm:block">
              Khaya le Kotini
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium hover:text-accent">
            Marketplace
          </Link>
          {user && (
            <>
              <Link to="/seller" className="flex items-center gap-1 text-sm font-medium hover:text-accent">
                <Store className="h-4 w-4" /> Sell
              </Link>
              <Link to="/leads" className="flex items-center gap-1 text-sm font-medium hover:text-accent">
                <Inbox className="h-4 w-4" /> Leads
              </Link>
              <Link to="/assistant" className="flex items-center gap-1 text-sm font-medium text-accent hover:opacity-80">
                <Sparkles className="h-4 w-4" /> King Kotini
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-crown hover:opacity-80">
                  <Crown className="h-4 w-4" /> Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/cart">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
                    {cartCount}
                  </Badge>
                )}
              </Link>
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
                  <UserIcon className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders">
                    <Package className="mr-2 h-4 w-4" /> My orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/seller">
                    <Store className="mr-2 h-4 w-4" /> Seller dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/leads">
                    <Inbox className="mr-2 h-4 w-4" /> Leads
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/assistant">
                    <Sparkles className="mr-2 h-4 w-4 text-accent" /> King Kotini
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Crown className="mr-2 h-4 w-4 text-crown" /> Admin console
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="hidden bg-accent text-accent-foreground hover:bg-accent/90 sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Ndwango</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                <MobileLink to="/" onClose={() => setMobileOpen(false)}>
                  <ShoppingBag className="h-4 w-4" /> Marketplace
                </MobileLink>
                {user && (
                  <>
                    <MobileLink to="/seller" onClose={() => setMobileOpen(false)}>
                      <Store className="h-4 w-4" /> Seller dashboard
                    </MobileLink>
                    <MobileLink to="/leads" onClose={() => setMobileOpen(false)}>
                      <Inbox className="h-4 w-4" /> Leads
                    </MobileLink>
                    <MobileLink to="/assistant" onClose={() => setMobileOpen(false)}>
                      <Sparkles className="h-4 w-4 text-accent" /> King Kotini
                    </MobileLink>
                    <MobileLink to="/orders" onClose={() => setMobileOpen(false)}>
                      <Package className="h-4 w-4" /> My orders
                    </MobileLink>
                    <MobileLink to="/cart" onClose={() => setMobileOpen(false)}>
                      <ShoppingBag className="h-4 w-4" /> Cart
                    </MobileLink>
                    {isAdmin && (
                      <MobileLink to="/admin" onClose={() => setMobileOpen(false)}>
                        <Crown className="h-4 w-4 text-crown" /> Admin console
                      </MobileLink>
                    )}
                  </>
                )}
              </div>
              <div className="mt-6 border-t pt-4">
                {user ? (
                  <>
                    <p className="mb-3 truncate text-xs text-muted-foreground">{user.email}</p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </Button>
                  </>
                ) : (
                  <Button
                    asChild
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/auth">Sign in</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileLink({
  to,
  onClose,
  children,
}: {
  to: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as never}
      onClick={onClose}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent/10 hover:text-accent"
    >
      {children}
    </Link>
  );
}
