import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeIndianRupee, Calculator, CirclePercent, HandCoins } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { categories, estimateEarnings, formatMoney, PLATFORM_FEE_LABEL } from "@/lib/borrowbee";

export const Route = createFileRoute("/earnings")({
  head: () => ({ meta: [
    { title: "Earnings estimator | BorrowBee" },
    { name: "description", content: "Estimate how much your items could earn on the BorrowBee ADYPU campus marketplace." },
    { property: "og:title", content: "Earnings estimator | BorrowBee" },
    { property: "og:description", content: "Estimate item rental earnings after the 12.5% BorrowBee service fee." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: EarningsPage,
});

function EarningsPage() {
  const [price, setPrice] = useState("400");
  const [days, setDays] = useState("6");
  const dailyPrice = Math.min(1_000_000, Math.max(0, Number(price) || 0));
  const rentedDays = Math.min(31, Math.max(0, Number(days) || 0));
  const { gross, fee, net } = estimateEarnings(dailyPrice, rentedDays);

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="For the things you share" title="Make room for a little extra." description="Set your own price and see how it adds up, based on the days you think your item might be rented." />
        <div className="mt-9 grid gap-12 lg:grid-cols-[1fr_0.8fr]">
          <div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand-gold-soft"><Calculator /></span><h2 className="text-2xl font-semibold">Your monthly estimate</h2></div>
            <div className="mt-6 space-y-6 border-y border-border py-6">
              <div className="space-y-2"><Label htmlFor="daily-price">Your daily rental price</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span><Input id="daily-price" type="number" min={0} max={1_000_000} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} className="h-12 pl-8 pr-24"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">per day</span></div></div>
              <div className="space-y-2"><Label htmlFor="rented-days">Days it’s rented in a month</Label><div className="relative"><Input id="rented-days" type="number" min={0} max={31} inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} className="h-12 pr-20"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">days</span></div></div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">This is an estimate, not a promise. What you earn depends on demand, item availability, and the prices you choose.</p>
          </div>
          <div className="self-start border-t-4 border-primary bg-card p-6 shadow-sm sm:p-8" aria-live="polite">
            <p className="text-sm font-semibold uppercase text-brand-terracotta">Estimated monthly payout</p><p className="mt-3 font-heading text-5xl font-semibold sm:text-6xl">{formatMoney(Math.round(net))}</p>
            <div className="mt-7 divide-y divide-border border-y border-border">
              <p className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted-foreground">{formatMoney(dailyPrice)} × {rentedDays} days</span><strong>{formatMoney(gross)}</strong></p>
              <p className="flex justify-between gap-4 py-4 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><CirclePercent size={16}/>{PLATFORM_FEE_LABEL} BorrowBee fee</span><span>− {formatMoney(Math.round(fee))}</span></p>
              <p className="flex justify-between gap-4 py-4 text-sm"><span className="flex items-center gap-2 font-medium"><HandCoins size={16}/> Estimated to you</span><strong>{formatMoney(Math.round(net))}</strong></p>
            </div>
            <Button asChild size="lg" className="mt-6 w-full"><Link to="/post-item">List an item <ArrowRight /></Link></Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Only charged when you earn from a rental.</p>
          </div>
        </div>
        <div className="mt-14 border-t border-border pt-8"><p className="text-sm font-semibold uppercase text-brand-terracotta">A little of everything</p><h2 className="mt-2 text-2xl font-semibold">Useful things, ready to share</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.slice(0,5).map((category) => <li key={category.value} className="border-b border-border pb-3"><strong className="block">{category.label}</strong><span className="mt-1 block text-sm text-muted-foreground">{category.examples}</span></li>)}</ul></div>
      </section>
    </BorrowBeeLayout>
  );
}