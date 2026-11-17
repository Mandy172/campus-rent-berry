import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Heart, Instagram, LogIn, LogOut, Menu, PackageCheck, Search, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { BRAND, categoryName, formatMoney, priceLabel, primaryImage } from "@/lib/borrowbee";
import type { Listing } from "@/lib/borrowbee";

export function BorrowBeeLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useSupabaseAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:min-h-[4.5rem] md:px-8">
          <Link to="/" aria-label="BorrowBee home" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo-mark.png" alt="" className="h-8 w-auto object-contain" />
            <span className="font-heading text-xl font-semibold">{BRAND.name}</span>
          </Link>
          <nav aria-label="Main" className={`${menuOpen ? "absolute inset-x-0 top-full flex flex-col items-stretch border-b border-border bg-background p-4 shadow-md" : "hidden"} gap-1 md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
            <NavLink to="/browse" icon={<Search size={17} />}>Browse</NavLink>
            <NavLink to="/earnings" icon={<Sparkles size={17} />}>Earnings</NavLink>
            <NavLink to="/blog">Journal</NavLink>
            {user && <NavLink to="/my-rentals" icon={<PackageCheck size={17} />}>My rentals</NavLink>}
            {user && <NavLink to="/my-listings" icon={<Heart size={17} />}>My items</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-36 truncate text-sm text-muted-foreground lg:block">{user.user_metadata?.["full_name"] ?? user.email}</span>
                <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); }}><LogOut className="md:hidden" /><span className="hidden md:inline">Sign out</span></Button>
              </>
            ) : <Button asChild size="sm"><Link to="/sign-in" search={{ next: "/browse" }}><LogIn /> <span>Sign in</span></Link></Button>}
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu /></Button>
          </div>
        </div>
      </header>
      <InstallPrompt />
      <main className="min-h-[60dvh] flex-1">{children}</main>
      <footer className="bg-brand-ink text-secondary-foreground">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-11 md:grid-cols-[1fr_auto_auto] md:items-start md:px-8">
          <div><Link to="/" className="flex w-fit items-center gap-2"><img src="/logo-mark.png" alt="" className="h-7 w-auto brightness-0 invert"/><span className="font-heading text-xl font-semibold">{BRAND.name}</span></Link><p className="mt-3 max-w-md text-sm leading-6 text-secondary-foreground/70">Borrow from classmates and make more use of what you own. For the {BRAND.community} community.</p></div>
          <nav aria-label="Marketplace links" className="grid content-start gap-2 text-sm"><span className="mb-1 font-semibold text-primary">Marketplace</span><Link to="/browse" className="text-secondary-foreground/75 hover:text-primary">Browse items</Link><Link to="/post-item" className="text-secondary-foreground/75 hover:text-primary">List an item</Link><Link to="/my-rentals" className="text-secondary-foreground/75 hover:text-primary">My rentals</Link></nav>
          <nav aria-label="About BorrowBee" className="grid content-start gap-2 text-sm"><span className="mb-1 font-semibold text-primary">{BRAND.name}</span><Link to="/blog" className="text-secondary-foreground/75 hover:text-primary">Journal</Link><Link to="/earnings" className="text-secondary-foreground/75 hover:text-primary">Earnings estimator</Link><a href={`mailto:${BRAND.supportEmail}`} className="text-secondary-foreground/75 hover:text-primary">Contact</a></nav>
        </div>
        <div className="border-t border-secondary-foreground/15 px-5 py-5 text-center text-xs text-secondary-foreground/60">© {new Date().getFullYear()} {BRAND.name} · {BRAND.communityShort} campus community</div>
      </footer>
    </div>
  );
}

function InstallPrompt() {
  const [available, setAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || sessionStorage.getItem("borrowbee-install-dismissed")) return;
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferredPrompt(event); setAvailable(true); };
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIos) setAvailable(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!available) return null;
  const dismiss = () => { sessionStorage.setItem("borrowbee-install-dismissed", "1"); setAvailable(false); };

  return <aside role="dialog" aria-label={`Install ${BRAND.name}`} className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 border border-border bg-card p-3 shadow-lg"><img src="/icon-192.png" alt="" className="size-11 shrink-0"/><p className="min-w-0 flex-1 text-sm">{deferredPrompt ? <><strong className="block">Install {BRAND.name}</strong><span className="text-xs text-muted-foreground">Add it to your home screen for quick access.</span></> : <><strong className="block">Add {BRAND.name} to your home screen</strong><span className="text-xs text-muted-foreground">Tap Share, then “Add to Home Screen”.</span></>}</p>{deferredPrompt && <Button size="sm" onClick={async () => { const prompt = deferredPrompt as Event & { prompt?: () => Promise<void>; userChoice?: Promise<unknown> }; await prompt.prompt?.(); await prompt.userChoice; dismiss(); }}>Install</Button>}<Button variant="ghost" size="icon" aria-label="Dismiss install prompt" onClick={dismiss}>×</Button></aside>;
}

function NavLink({ to, children, icon }: { to: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const location = useLocation();
  return <Link to={to as "/browse"} activeProps={{ className: "bg-accent text-foreground" }} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground ${location.pathname === to ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{icon}{children}</Link>;
}

export function ItemCard({ listing }: { listing: Listing }) {
  return (
    <Link to="/items/$id" params={{ id: listing.id }} className="group block overflow-hidden border border-border bg-card transition-colors hover:border-ring">
      <div className="relative aspect-[1.12/1] overflow-hidden bg-muted">
        <img src={primaryImage(listing)} alt={listing.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 bg-background/90 px-2.5 py-1 text-xs font-semibold">{categoryName(listing.category)}</span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 min-h-12 text-lg font-semibold leading-6">{listing.title}</h3>
        <p className="text-base font-semibold text-brand-terracotta">{priceLabel(listing)}</p>
        <p className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><span className="truncate">{listing.owner_name}</span><span className="flex shrink-0 items-center gap-1"><span className="size-1.5 rounded-full bg-brand-green" />{listing.location}</span></p>
      </div>
    </Link>
  );
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="border-b border-border pb-7"><p className="text-sm font-semibold uppercase text-brand-terracotta">{eyebrow}</p><h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{description}</p></div>;
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive">{children}</p>;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function useSignInActions() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(provider: "google" | "lovable", nextPath: string) {
    setBusy(true);
    setError("");
    sessionStorage.setItem("borrowbee-next", nextPath);
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) { setBusy(false); setError(result.error.message); }
    if (!result.redirected && !result.error) {
      await navigate({ to: nextPath as "/browse" });
    }
  }

  async function signOut() {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setBusy(false);
    if (signOutError) { toast.error("Could not sign out. Try again."); return; }
    toast.success("Signed out.");
  }

  return { busy, error, setError, signIn, signOut };
}