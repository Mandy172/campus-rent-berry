import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarDays, Check, CircleDashed, Clock3, LoaderCircle, PackageOpen, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BorrowBeeLayout, formatDate, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { formatMoney, primaryImage } from "@/lib/borrowbee";
import { listMyRentals, respondToRental } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/my-rentals")({
  head: () => ({ meta: [
    { title: "My rental requests | BorrowBee" },
    { name: "description", content: "See your rental requests and manage borrowing plans on BorrowBee." },
    { property: "og:title", content: "My rental requests | BorrowBee" },
    { property: "og:description", content: "Track rental requests on BorrowBee." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MyRentalsPage,
});

const statusText: Record<string, string> = { pending: "Waiting for a reply", accepted: "Request accepted", declined: "Request declined", cancelled: "Request cancelled", completed: "Rental complete" };

function MyRentalsPage() {
  const { user, ready } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const loadRentals = useServerFn(listMyRentals);
  const respond = useServerFn(respondToRental);
  const [busyId, setBusyId] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["my-rentals"], queryFn: () => loadRentals(), enabled: Boolean(user) });

  async function changeStatus(id: string, action: "cancel" | "accept" | "decline") {
    setBusyId(id);
    try {
      await respond({ data: { id, action } });
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
      toast.success(action === "accept" ? "Rental request accepted." : action === "decline" ? "Rental request declined." : "Rental request cancelled.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "The request could not be updated."); }
    finally { setBusyId(""); }
  }

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-5xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="Your plans" title="My rentals" description="Check what you’ve requested and reply to people asking about your items." />
        {!ready ? <p className="py-12 text-center text-muted-foreground">Checking your sign-in…</p> : !user ? <SignInPrompt /> : isLoading ? <p className="py-12 text-center text-muted-foreground">Loading your rentals…</p> : error ? <p role="alert" className="py-12 text-center text-destructive">Your rental requests could not be loaded.</p> : !data?.length ? <div className="py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><PackageOpen /></span><h2 className="mt-4 text-2xl font-semibold">No rental requests yet</h2><p className="mt-2 text-muted-foreground">Your requests and incoming replies will appear here.</p><Button asChild className="mt-5"><a href="/browse">Browse items <ArrowRight /></a></Button></div> : (
          <ol className="mt-8 divide-y divide-border border-y border-border">{data.map((rental) => <li key={rental.id} className="py-6"><article className="grid gap-5 sm:grid-cols-[150px_1fr] sm:gap-7"><a className="block overflow-hidden bg-muted" href={rental.listing ? `/items/${rental.listing.id}` : "/browse"}><img className="aspect-[1.25/1] w-full object-cover" src={rental.listing ? primaryImage(rental.listing) : "/items/rolling-cooler.jpg"} alt={rental.listing?.title ?? "Rental item"}/></a><div><div className="flex flex-wrap items-center justify-between gap-3"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-brand-terracotta"><CircleDashed size={15}/>{rental.side === "borrower" ? "You’re borrowing" : "Your item"}</p><span className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 text-xs font-medium"><span className={`size-2 rounded-full ${rental.status === "accepted" ? "bg-brand-green" : rental.status === "declined" || rental.status === "cancelled" ? "bg-brand-terracotta" : "bg-primary"}`} />{statusText[rental.status] ?? rental.status}</span></div><h2 className="mt-2 text-xl font-semibold">{rental.listing?.title ?? "Listing unavailable"}</h2><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays size={15}/>{formatDate(rental.start_date)} – {formatDate(rental.end_date)}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={15}/>{rental.days} {rental.days === 1 ? "day" : "days"}</span></p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"><span>Rental: <strong>{formatMoney(rental.subtotal)}</strong></span>{rental.deposit > 0 && <span className="text-muted-foreground">Refundable deposit: {formatMoney(rental.deposit)}</span>}</div>{rental.note && <p className="mt-3 border-l-2 border-border pl-3 text-sm text-muted-foreground">{rental.note}</p>}{rental.status === "pending" && <div className="mt-4 flex flex-wrap gap-2">{rental.side === "owner" ? <><Button size="sm" disabled={busyId === rental.id} onClick={() => void changeStatus(rental.id, "accept")}>{busyId === rental.id ? <LoaderCircle className="animate-spin"/> : <Check/>} Accept</Button><Button size="sm" variant="outline" disabled={busyId === rental.id} onClick={() => void changeStatus(rental.id, "decline")}><X/> Decline</Button></> : <Button size="sm" variant="outline" disabled={busyId === rental.id} onClick={() => void changeStatus(rental.id, "cancel")}><X/> Cancel request</Button>}</div>}</div></article></li>)}</ol>
        )}
      </section>
    </BorrowBeeLayout>
  );
}

function SignInPrompt() {
  return <div className="mt-8 border-l-2 border-primary bg-brand-gold-soft/30 p-5"><h2 className="font-semibold">Sign in to see your rentals</h2><p className="mt-1 text-sm text-muted-foreground">Rental requests are only visible to you and the other member involved.</p><Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fmy-rentals">Sign in to continue <ArrowRight /></a></Button></div>;
}