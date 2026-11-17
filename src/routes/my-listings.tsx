import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, PackageOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { priceLabel, primaryImage } from "@/lib/borrowbee";
import { deleteListing, listMyListings, setListingAvailability } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/my-listings")({
  head: () => ({ meta: [
    { title: "My items | BorrowBee" },
    { name: "description", content: "Manage the items you’ve shared with the ADYPU community." },
    { property: "og:title", content: "My items | BorrowBee" },
    { property: "og:description", content: "Manage your BorrowBee marketplace listings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const { user, ready } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const load = useServerFn(listMyListings);
  const setAvailability = useServerFn(setListingAvailability);
  const remove = useServerFn(deleteListing);
  const [busyId, setBusyId] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["my-listings"], queryFn: () => load(), enabled: Boolean(user) });

  async function toggle(id: string, available: boolean) {
    setBusyId(id);
    try { await setAvailability({ data: { id, available } }); await queryClient.invalidateQueries({ queryKey: ["my-listings"] }); toast.success(available ? "Item is available." : "Item is paused."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The item could not be updated."); }
    finally { setBusyId(""); }
  }

  async function removeItem(id: string) {
    if (!window.confirm("Remove this item from your listings?")) return;
    setBusyId(id);
    try { await remove({ data: { id } }); await queryClient.invalidateQueries({ queryKey: ["my-listings"] }); await queryClient.invalidateQueries({ queryKey: ["marketplace"] }); toast.success("Item removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The item could not be removed."); }
    finally { setBusyId(""); }
  }

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-5xl px-5 py-9 md:px-8 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4"><PageHeading eyebrow="Your things" title="My items" description="Keep your shared items up to date with availability and current details."/><Button asChild><a href="/post-item"><Plus/> List an item</a></Button></div>
        {!ready ? <p className="py-12 text-center text-muted-foreground">Checking your sign-in…</p> : !user ? <div className="mt-7 border-l-2 border-primary bg-brand-gold-soft/30 p-5"><h2 className="font-semibold">Sign in to manage your items</h2><p className="mt-1 text-sm text-muted-foreground">Only you can update or remove your listings.</p><Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fmy-listings">Sign in to continue <ArrowRight /></a></Button></div> : isLoading ? <p className="py-12 text-center text-muted-foreground">Loading your items…</p> : !data?.length ? <div className="py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><PackageOpen/></span><h2 className="mt-4 text-2xl font-semibold">Nothing listed yet</h2><p className="mt-2 text-muted-foreground">Share something useful with your campus community.</p><Button asChild className="mt-5"><a href="/post-item">List your first item <ArrowRight /></a></Button></div> : <ol className="mt-8 divide-y divide-border border-y border-border">{data.map((listing) => <li key={listing.id} className="py-5"><article className="grid gap-4 sm:grid-cols-[130px_1fr_auto] sm:items-center sm:gap-6"><a href={`/items/${listing.id}`} className="block overflow-hidden bg-muted"><img src={primaryImage(listing)} alt={listing.title} className="aspect-[1.2/1] w-full object-cover"/></a><div><p className="text-xs font-semibold uppercase text-brand-terracotta">{listing.available ? "Available to borrow" : "Paused"}</p><h2 className="mt-1 text-xl font-semibold"><a href={`/items/${listing.id}`} className="hover:underline">{listing.title}</a></h2><p className="mt-1 text-sm text-muted-foreground">{priceLabel(listing)} · {listing.location}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busyId === listing.id} onClick={() => void toggle(listing.id, !listing.available)}>{listing.available ? <EyeOff/> : <Eye/>}{listing.available ? "Pause" : "Make available"}</Button><Button size="icon" variant="ghost" aria-label={`Remove ${listing.title}`} disabled={busyId === listing.id} onClick={() => void removeItem(listing.id)}><Trash2/></Button></div></article></li>)}</ol>}
      </section>
    </BorrowBeeLayout>
  );
}