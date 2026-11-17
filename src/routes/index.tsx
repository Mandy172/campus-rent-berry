import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Box, Camera, Clock3, HeartHandshake, Leaf, MapPin, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BorrowBeeLayout, ItemCard } from "@/components/borrowbee-layout";
import { BRAND, PLATFORM_FEE_LABEL, categoryName, formatMoney, priceLabel, primaryImage } from "@/lib/borrowbee";
import { listingsQueryOptions } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQueryOptions()),
  head: () => ({
    meta: [
      { title: "BorrowBee | Campus rentals at ADYPU" },
      { name: "description", content: "Borrow what you need and earn from what you own. Discover campus rentals from the ADYPU community." },
      { property: "og:title", content: "BorrowBee | Campus rentals at ADYPU" },
      { property: "og:description", content: "Borrow what you need and earn from what you own at ADYPU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const featured = listings.slice(0, 3);

  return (
    <BorrowBeeLayout>
      <section className="relative overflow-hidden bg-brand-gold-soft/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-8 md:pb-24 md:pt-20">
          <div className="bee-fade-up relative z-10">
            <p className="inline-flex items-center gap-2 border-b border-foreground/15 pb-3 text-sm font-semibold">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary"><Sparkles size={15} /></span>
              A marketplace made for ADYPU
            </p>
            <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.04] sm:text-6xl md:text-7xl">
              Borrow what you need. <span className="text-brand-terracotta">Earn</span> from what you own.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Find useful things from people on campus. Share your own gear when someone needs it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/browse">Find something to borrow <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 border-foreground/20 bg-background/70 px-6 text-base">
                <Link to="/post-item">List an item <ArrowUpRight /></Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-4 border-t border-foreground/15 pt-6">
              <div className="flex -space-x-2" aria-hidden="true">
                {['K', 'J', 'A'].map((letter, index) => <span key={letter} className={`flex size-9 items-center justify-center rounded-full border-2 border-background text-sm font-bold ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-brand-green/20' : 'bg-brand-terracotta/15'}`}>{letter}</span>)}
              </div>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Campus community first.</strong><br />Built around familiar places and faces.</p>
            </div>
          </div>
          <div className="relative min-w-0">
            <Link to="/browse" aria-label="Browse campus rentals" className="group block">
              <div className="overflow-hidden rounded-sm bg-card">
                <img className="aspect-[1.08/1] w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" src={primaryImage(featured[0] ?? listings[0])} alt={featured[0]?.title ?? "Campus rental item"} />
              </div>
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">A little less stuff to buy</p>
                  <p className="mt-1 max-w-sm text-xl font-semibold sm:text-2xl">More things to do with what you have.</p>
                </div>
                <div className="flex max-w-full shrink-0 items-center gap-3 border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
                  <span className="grid size-10 place-items-center rounded-full bg-brand-gold-soft"><MapPin size={19} /></span>
                  <span><strong className="block text-sm">Around your campus</strong><span className="text-xs text-muted-foreground">ADYPU pickup spots</span></span>
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowUpRight /></span>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-8 md:px-8"><a href="#available" className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">See what’s available <ArrowDown size={14} /></a></div>
      </section>

      <section id="available" className="scroll-mt-16 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-sm font-semibold uppercase text-brand-terracotta">Fresh from campus</p><h2 className="mt-2 text-4xl font-semibold">Available this week</h2><p className="mt-3 max-w-lg text-muted-foreground">See what other ADYPU members have shared with the community.</p></div>
            <Button asChild variant="outline"><Link to="/browse">Browse all items <ArrowRight /></Link></Button>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => <ItemCard key={listing.id} listing={listing} />)}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-12">
        <ul className="mx-auto grid max-w-7xl gap-7 px-5 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
          {[
            { icon: <BadgeCheck />, title: "Community-led", copy: "Share within the campus community." },
            { icon: <ShieldCheck />, title: "Clear expectations", copy: "Agree on dates, pickup and returns." },
            { icon: <Clock3 />, title: "Only when you need it", copy: "Borrow for a day or a little longer." },
            { icon: <Leaf />, title: "Share more", copy: "Make useful things go further." },
          ].map((item) => <li key={item.title} className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-gold-soft">{item.icon}</span><span><strong className="block">{item.title}</strong><span className="mt-1 block text-sm text-muted-foreground">{item.copy}</span></span></li>)}
        </ul>
      </section>

      <section className="bg-brand-ink py-16 text-secondary-foreground md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_auto] md:items-center md:px-8">
          <div><p className="text-sm font-semibold uppercase text-primary">Share a little</p><h2 className="mt-3 max-w-xl text-4xl font-semibold">That useful thing in your room? Someone nearby may need it.</h2><p className="mt-4 max-w-xl leading-7 text-secondary-foreground/75">Set your price, tell people where to meet, and make more use of what you already own.</p></div>
          <Button asChild size="lg" className="w-fit"><Link to="/earnings">Estimate your earnings <ArrowRight /></Link></Button>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-sm font-semibold uppercase text-brand-terracotta">Simple by design</p><h2 className="mt-2 text-4xl font-semibold">From need to handoff</h2>
          <ol className="mt-8 grid gap-6 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", icon: <Box />, title: "Find an item", copy: "Browse gear shared by your campus community." },
              { n: "02", icon: <HeartHandshake />, title: "Send a request", copy: "Choose your dates and tell the owner what you need." },
              { n: "03", icon: <Truck />, title: "Meet on campus", copy: "Arrange a simple handoff at a familiar campus spot." },
              { n: "04", icon: <Camera />, title: "Return with care", copy: "Bring it back as agreed and ready for the next person." },
            ].map((step) => <li key={step.n} className="border-l-2 border-primary pl-5"><span className="flex items-center gap-3 text-sm font-semibold text-brand-terracotta">{step.n} <span className="text-foreground">{step.icon}</span></span><h3 className="mt-4 text-xl font-semibold">{step.title}</h3><p className="mt-2 max-w-xs leading-6 text-muted-foreground">{step.copy}</p></li>)}
          </ol>
        </div>
      </section>
      <div className="sr-only">{categoryName("event")} · {formatMoney(0)} · {PLATFORM_FEE_LABEL} · {BRAND.community}</div>
    </BorrowBeeLayout>
  );
}