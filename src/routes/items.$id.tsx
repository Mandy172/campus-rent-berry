import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock3, MapPin, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { categoryName, formatMoney, priceLabel, primaryImage } from "@/lib/borrowbee";
import { ErrorMessage } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listingQueryOptions, listingsQueryOptions } from "@/lib/marketplace";
import { requestRental } from "@/lib/marketplace.functions";
import { rentalQuote } from "@/lib/pricing";
import { SavedListingButton } from "@/components/saved-listing-button";
import { startConversation } from "@/lib/community.functions";

export const Route = createFileRoute("/items/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(listingQueryOptions(params.id)),
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.title ?? "Item"} | BorrowBee` },
    { name: "description", content: loaderData?.description ?? "A campus rental from the BorrowBee marketplace." },
    { property: "og:title", content: `${loaderData?.title ?? "Item"} | BorrowBee` },
    { property: "og:description", content: loaderData?.description ?? "A campus rental from the BorrowBee marketplace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const { data: listing } = useSuspenseQuery(listingQueryOptions(id));
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const requestRentalFn = useServerFn(requestRental);
  const startConversationFn = useServerFn(startConversation);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const quote = listing ? rentalQuote(listing, Math.max(1, Math.ceil((Date.parse(`${endDate || startDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1), 1) : null;

  async function contactOwner() {
    if (!listing) return;
    if (!user) {
      await navigate({ to: "/sign-in", search: { next: `/items/${listing.id}` } });
      return;
    }
    try {
      const { conversationId } = await startConversationFn({ data: { listingId: listing.id } });
      await navigate({ to: "/messages", search: { conversation: conversationId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The conversation could not be started.");
    }
  }

  async function submitRental(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listing) return;
    if (!user) {
      window.location.assign(`/sign-in?next=${encodeURIComponent(`/items/${listing.id}`)}`);
      return;
    }
    setPending(true); setMessage("");
    try {
      const result = await requestRentalFn({ data: { listingId: listing.id, startDate, endDate, quantity: 1, note } });
      toast.success(`Request sent · ${formatMoney(result.subtotal)} before the refundable deposit.`);
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
      setMessage("Your request is on its way. You can follow its status under My rentals.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your request could not be sent. Please try again.");
    } finally { setPending(false); }
  }
  if (!listing) return <BorrowBeeLayout><div className="mx-auto max-w-3xl px-5 py-16"><PageHeading eyebrow="No longer available" title="This item isn’t here." description="It may have already been rented or removed." /><Button asChild className="mt-6"><Link to="/browse"><ArrowLeft /> Browse items</Link></Button></div></BorrowBeeLayout>;

  return (
    <BorrowBeeLayout>
      <article className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3"><Link to="/browse"><ArrowLeft /> Back to all items</Link></Button>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          <div><div className="overflow-hidden border border-border bg-muted"><img src={primaryImage(listing)} alt={listing.title} className="aspect-[1.1/1] w-full object-cover" /></div><div className="mt-7 border-t border-border pt-6"><p className="text-sm font-semibold uppercase text-brand-terracotta">About this item</p><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{listing.description}</p>{listing.tags.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{listing.tags.map((tag) => <li key={tag} className="bg-muted px-3 py-1 text-xs">{tag}</li>)}</ul>}</div><div className="mt-7 border-t border-border pt-6"><p className="text-sm font-semibold uppercase text-brand-terracotta">A clear handoff</p><ul className="mt-4 space-y-3">{(listing.rules.length ? listing.rules : ["Return clean and on time", "No subletting", "Report any damage right away"]).map((rule) => <li key={rule} className="flex items-center gap-3 text-sm"><Check size={17} className="text-brand-green" /> {rule}</li>)}</ul></div></div>
          <aside className="self-start border-y border-border py-6 lg:sticky lg:top-28 lg:border">
            <div className="px-0 lg:px-6"><div className="flex flex-wrap items-center gap-2"><span className="bg-brand-gold-soft px-2.5 py-1 text-xs font-semibold">{categoryName(listing.category)}</span><span className="bg-muted px-2.5 py-1 text-xs">{listing.condition}</span><SavedListingButton listingId={listing.id} /></div><h1 className="mt-4 text-3xl font-semibold leading-tight">{listing.title}</h1><p className="mt-3 text-muted-foreground">Listed by <strong className="text-foreground">{listing.owner_name}</strong></p><div className="mt-6 border-y border-border py-5"><p className="font-heading text-3xl font-semibold text-brand-terracotta">{priceLabel(listing)}</p>{listing.deposit > 0 && <p className="mt-1 text-sm text-muted-foreground">Refundable deposit: {formatMoney(listing.deposit)}</p>}</div><div className="mt-5 flex items-start gap-3"><MapPin size={19} className="mt-0.5 shrink-0 text-brand-terracotta" /><span><strong className="block">Pickup near campus</strong><span className="mt-0.5 block text-sm text-muted-foreground">{listing.location}</span></span></div><div className="mt-5 grid gap-3 border-y border-border py-5 text-sm"><p className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-green" /> Clear rental terms</p><p className="flex items-center gap-2"><Clock3 size={17} className="text-brand-terracotta" /> Request dates that suit you</p><p className="flex items-center gap-2"><BadgeCheck size={17} /> A campus community listing</p></div>{user && user.id === listing.owner_id ? <Button asChild variant="outline" className="mt-6 w-full"><Link to="/my-listings">Manage your item <ArrowRight /></Link></Button> : <><Button variant="outline" className="mt-6 w-full" onClick={() => void contactOwner()}><MessageCircle /> Message owner</Button><form onSubmit={submitRental} className="mt-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="rental-start">Start date</Label><Input id="rental-start" type="date" min={today} required value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value); }} /></div><div className="space-y-2"><Label htmlFor="rental-end">Return date</Label><Input id="rental-end" type="date" min={startDate || today} required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="rental-note">Note for the owner <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="rental-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What do you need it for?" /></div>{startDate && endDate && quote && <div className="border-y border-border py-3 text-sm"><p className="flex justify-between"><span className="text-muted-foreground">Rental estimate</span><strong>{formatMoney(quote.subtotal)}</strong></p>{quote.deposit > 0 && <p className="mt-1 flex justify-between"><span className="text-muted-foreground">Refundable deposit</span><span>{formatMoney(quote.deposit)}</span></p>}</div>}{message && <ErrorMessage>{message}</ErrorMessage>}<Button size="lg" className="w-full" disabled={pending}>{pending ? "Sending request…" : "Request to borrow"} {!pending && <ArrowRight />}</Button><p className="text-center text-xs text-muted-foreground">The owner will confirm dates and arrange a pickup spot.</p></form></>}</div>
          </aside>
        </div>
        <div className="mt-12 flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground"><Sparkles size={17} /> Share more, buy less.</div>
      </article>
    </BorrowBeeLayout>
  );
}