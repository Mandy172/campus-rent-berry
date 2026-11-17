import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Camera, ImagePlus, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BorrowBeeLayout, ErrorMessage, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/integrations/supabase/client";
import { CAMPUS_LOCATIONS } from "@/lib/borrowbee-config";
import { categories, safeReturnPath } from "@/lib/borrowbee";
import { createListing } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/post-item")({
  head: () => ({ meta: [
    { title: "List an item | BorrowBee" },
    { name: "description", content: "Share an item with the ADYPU community on BorrowBee." },
    { property: "og:title", content: "List an item | BorrowBee" },
    { property: "og:description", content: "Make useful things available to the ADYPU community." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PostItemPage,
});

function PostItemPage() {
  const { user, ready } = useSupabaseAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { await navigate({ to: "/sign-in", search: { next: safeReturnPath(window.location.pathname) } }); return; }
    if (!category || !location || files.length === 0) { setMessage("Choose a category, pickup spot, and at least one photo."); return; }
    setBusy(true); setMessage("");
    const uploaded: Array<{ url: string; type: "image" }> = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("borrowbee-listings").upload(path, file, { contentType: file.type, upsert: false });
      if (error) { setBusy(false); setMessage("A photo could not be uploaded. Check the file size and try again."); return; }
      uploaded.push({ url: path, type: "image" });
    }
    try {
      const result = await createListing({ data: { title, category, dailyRate: Number(dailyRate), location, description, media: uploaded } });
      toast.success("Your item is listed.");
      await navigate({ to: "/items/$id", params: { id: result.id } });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your item could not be saved."); }
    setBusy(false);
  }

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-4xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="Share with ADYPU" title="List something useful." description="Tell people what it is, when you’re free to lend it, and where to meet." />
        {!ready ? <p className="py-10 text-center text-muted-foreground">Loading your sign-in…</p> : !user ? <div className="mt-7 border-l-2 border-primary bg-brand-gold-soft/30 p-5"><div className="flex gap-3"><ShieldCheck className="mt-1 shrink-0"/><div><h2 className="font-semibold">Sign in to list an item</h2><p className="mt-1 text-sm text-muted-foreground">Your listings stay connected to your account.</p><Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fpost-item">Sign in to continue <ArrowRight /></a></Button></div></div></div> : (
          <form onSubmit={submit} className="mt-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="item-title">Item name</Label><Input id="item-title" required minLength={3} maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What are you sharing?" /></div>
              <div className="space-y-2"><Label htmlFor="item-category">Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger id="item-category"><SelectValue placeholder="Choose a category" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="item-price">Daily price</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span><Input id="item-price" type="number" min={1} max={1_000_000} required value={dailyRate} onChange={(event) => setDailyRate(event.target.value)} placeholder="400" className="pl-8 pr-16"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">per day</span></div></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="item-location">Pickup spot</Label><Select value={location} onValueChange={setLocation}><SelectTrigger id="item-location"><SelectValue placeholder="Choose a campus location" /></SelectTrigger><SelectContent>{CAMPUS_LOCATIONS.map((spot) => <SelectItem value={spot} key={spot}>{spot}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="item-description">Description</Label><Textarea id="item-description" required minLength={10} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the condition, what’s included, and anything a borrower should know."/><p className="text-right text-xs text-muted-foreground">{description.length}/2,000</p></div>
            </div>
            <div className="mt-5 space-y-2"><Label htmlFor="item-photos">Item photos</Label><label htmlFor="item-photos" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/50 px-5 py-5 text-center transition-colors hover:bg-accent"><ImagePlus /><span className="text-sm font-medium">Add photos (up to 10)</span><span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 10 MB each</span></label><input id="item-photos" type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 10))}/>{files.length > 0 && <ul className="flex flex-wrap gap-2 pt-2">{files.map((file, index) => <li className="inline-flex items-center gap-2 border border-border px-2 py-1.5 text-xs" key={`${file.name}-${index}`}><Camera size={15}/><span className="max-w-40 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/></button></li>)}</ul>}</div>
            <div className="mt-6 border-t border-border pt-5"><p className="text-xs leading-5 text-muted-foreground">List items you’re allowed to lend. Your listing should show a clear pickup location and fair daily price.</p>{message && <div className="mt-4"><ErrorMessage>{message}</ErrorMessage></div>}<Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={busy}>{busy && <LoaderCircle className="animate-spin"/>}{busy ? "Sharing your item…" : "Share with the community"} {!busy && <ArrowRight />}</Button></div>
          </form>
        )}
      </section>
    </BorrowBeeLayout>
  );
}