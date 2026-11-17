import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, MailCheck, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorrowBeeLayout, ErrorMessage } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/integrations/supabase/client";
import { BRAND, safeReturnPath } from "@/lib/borrowbee";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({ next: typeof search["next"] === "string" ? safeReturnPath(search["next"]) : "/browse" }),
  head: () => ({ meta: [
    { title: "Sign in | BorrowBee" },
    { name: "description", content: "Sign in to BorrowBee to make rental requests and share items with the ADYPU community." },
    { property: "og:title", content: "Sign in | BorrowBee" },
    { property: "og:description", content: "Access the BorrowBee campus rental marketplace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SignInPage,
});

function SignInPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useSupabaseAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (ready && user) return <BorrowBeeLayout><section className="mx-auto max-w-xl px-5 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-gold-soft"><ShieldCheck /></span><h1 className="mt-5 text-3xl font-semibold">You’re signed in.</h1><p className="mt-2 text-muted-foreground">Continue back to where you were.</p><Button className="mt-6" onClick={() => void navigate({ to: next as "/browse" })}>Continue <ArrowRight /></Button></section></BorrowBeeLayout>;

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/sign-in?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "sign-up" && !result.data.session) { setMessage("Check your email to confirm your account. Your confirmation link will bring you back here to continue."); return; }
    sessionStorage.setItem("borrowbee-next", next);
    toast.success(mode === "sign-in" ? "Welcome back." : "Your account is ready.");
    await navigate({ to: next as "/browse" });
  }

  async function handleSocial(provider: "google" | "lovable") {
    setBusy(true); setMessage(""); sessionStorage.setItem("borrowbee-next", next);
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) { setBusy(false); setMessage(result.error.message); return; }
    if (!result.redirected) await navigate({ to: next as "/browse" });
  }

  return (
    <BorrowBeeLayout>
      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-16">
        <div className="hidden md:block"><p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-brand-terracotta"><Sparkles size={16} /> For the campus community</p><h1 className="mt-4 text-5xl font-semibold">Good things move around here.</h1><p className="mt-5 max-w-sm leading-7 text-muted-foreground">Sign in to request an item, check your rentals, or share something useful with your classmates.</p><div className="mt-8 border-t border-border pt-6"><div className="flex items-center gap-3 text-sm"><span className="grid size-9 place-items-center rounded-full bg-brand-gold-soft"><MailCheck size={18}/></span><span><strong className="block">A campus-first community</strong><span className="text-muted-foreground">{BRAND.community}</span></span></div></div></div>
        <div className="mx-auto w-full max-w-md border-t-4 border-primary bg-card p-6 shadow-sm sm:p-8"><Button asChild variant="ghost" size="sm" className="-ml-3 mb-4"><a href="/browse"><ArrowLeft /> Browse first</a></Button><div className="flex gap-2 border-b border-border"><button type="button" className={`border-b-2 px-3 py-3 text-sm font-semibold ${mode === "sign-in" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => { setMode("sign-in"); setMessage(""); }}>Sign in</button><button type="button" className={`border-b-2 px-3 py-3 text-sm font-semibold ${mode === "sign-up" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => { setMode("sign-up"); setMessage(""); }}>Create account</button></div><h2 className="mt-6 text-2xl font-semibold">{mode === "sign-in" ? "Welcome back" : "Join the community"}</h2><p className="mt-1 text-sm text-muted-foreground">{mode === "sign-in" ? "Pick up where you left off." : "Make sharing useful things easy."}</p>
          <div className="mt-5 grid gap-2"><Button variant="outline" className="h-11" disabled={busy} onClick={() => void handleSocial("google")}><AtSign /> Continue with Google</Button><Button variant="outline" className="h-11" disabled={busy} onClick={() => void handleSocial("lovable")}><Sparkles /> Continue with Lovable</Button></div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" /></div>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="pr-11" placeholder="At least 6 characters"/><Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-0" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>{message && <ErrorMessage>{message}</ErrorMessage>}<Button className="h-11 w-full" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"} {mode === "sign-up" ? <UserPlus /> : <ArrowRight />}</Button></form>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">We use your sign-in to keep your rental requests and listings connected to you.</p>
        </div>
      </section>
    </BorrowBeeLayout>
  );
}