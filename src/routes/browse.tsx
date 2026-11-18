import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BorrowBeeLayout, ItemCard, PageHeading } from "@/components/borrowbee-layout";
import { CAMPUS_LOCATIONS } from "@/lib/borrowbee-config";
import { categoryName, categories, filterListings } from "@/lib/borrowbee";
import { listingsQueryOptions } from "@/lib/marketplace";

export const Route = createFileRoute("/browse")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQueryOptions()),
  head: () => ({ meta: [
    { title: "Browse campus rentals | RentBerry" },
    { name: "description", content: "Browse items shared by the ADYPU community, with clear prices and campus pickup locations." },
    { property: "og:title", content: "Browse campus rentals | RentBerry" },
    { property: "og:description", content: "Find useful items shared by the ADYPU community." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BrowsePage,
});

function BrowsePage() {
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const visible = useMemo(() => filterListings(listings, { query, category, location }), [listings, query, category, location]);
  const hasFilters = Boolean(query || category || location);

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="ADYPU marketplace" title="Find what you need." description="From event gear to everyday tools, discover what your campus community has available." />
        <div className="mt-7 grid gap-3 border-b border-border pb-7 md:grid-cols-[1fr_220px_250px]">
          <label className="relative"><span className="sr-only">Search items</span><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gear, books, and more" className="h-11 pl-10" /></label>
          <Select value={category} onValueChange={(value) => setCategory(value === "all" ? "" : value)}><SelectTrigger className="h-11" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem value={item.value} key={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={location} onValueChange={(value) => setLocation(value === "all" ? "" : value)}><SelectTrigger className="h-11" aria-label="Filter by pickup location"><SelectValue placeholder="Every pickup spot" /></SelectTrigger><SelectContent><SelectItem value="all">Every pickup spot</SelectItem>{CAMPUS_LOCATIONS.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex items-center justify-between gap-3 py-5">
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">{visible.length}</strong> {visible.length === 1 ? "item" : "items"} available{category ? ` · ${categoryName(category)}` : ""}</p>
          {hasFilters && <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setCategory(""); setLocation(""); }}><X /> Clear filters</Button>}
        </div>
        {visible.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((listing) => <ItemCard key={listing.id} listing={listing} />)}</div> : <div className="border-y border-border py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><SlidersHorizontal /></span><h2 className="mt-4 text-2xl font-semibold">No items match those filters</h2><p className="mt-2 text-muted-foreground">Try a different word or pickup spot.</p><Button variant="outline" className="mt-5" onClick={() => { setQuery(""); setCategory(""); setLocation(""); }}>Show everything</Button></div>}
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={17} /> Pickup locations throughout ADYPU</span><Button asChild variant="outline"><Link to="/post-item">Share something of your own <ArrowUpRight /></Link></Button></div>
      </section>
    </BorrowBeeLayout>
  );
}