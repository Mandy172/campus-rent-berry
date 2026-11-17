import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorrowBeeLayout, ItemCard, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listSavedListings } from "@/lib/community.functions";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [
    { title: "Saved items | BorrowBee" },
    { name: "description", content: "Your privately saved BorrowBee campus listings." },
    { property: "og:title", content: "Saved items | BorrowBee" },
    { property: "og:description", content: "Return to items you saved on BorrowBee." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SavedPage,
});

function SavedPage() {
  const { user, ready } = useSupabaseAuth();
  const load = useServerFn(listSavedListings);
  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-listings", user?.id],
    queryFn: () => load(),
    enabled: Boolean(user),
  });

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="For another time" title="Saved items" description="The campus listings you’ve kept close." />
        {!ready ? <p className="py-12 text-center text-muted-foreground">Checking your sign-in…</p>
          : !user ? <div className="mt-8 border-l-2 border-primary bg-brand-gold-soft/30 p-5">
            <h2 className="font-semibold">Sign in to see your saved items</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your saved list is private to your account.</p>
            <Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fsaved">Sign in <ArrowRight /></a></Button>
          </div>
          : isLoading ? <p className="py-12 text-center text-muted-foreground">Loading saved items…</p>
            : error ? <p role="alert" className="py-12 text-center text-destructive">Your saved items could not be loaded.</p>
              : data?.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.map((listing) => <ItemCard key={listing.id} listing={listing} />)}</div>
                : <div className="border-y border-border py-14 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><Bookmark /></span>
                  <h2 className="mt-4 text-2xl font-semibold">No saved items yet</h2>
                  <p className="mt-2 text-muted-foreground">Save a listing to find it again here.</p>
                  <Button asChild className="mt-5"><a href="/browse">Browse items <ArrowRight /></a></Button>
                </div>}
      </section>
    </BorrowBeeLayout>
  );
}