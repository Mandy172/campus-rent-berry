import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listSavedListingIds, toggleSavedListing } from "@/lib/community.functions";

export function SavedListingButton({ listingId }: { listingId: string }) {
  const { user, ready } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const loadIds = useServerFn(listSavedListingIds);
  const toggle = useServerFn(toggleSavedListing);
  const [busy, setBusy] = useState(false);
  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-listing-ids", user?.id],
    queryFn: () => loadIds(),
    enabled: Boolean(user),
  });
  const saved = savedIds.includes(listingId);

  async function handleToggle() {
    if (!ready || !user) {
      window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const result = await toggle({ data: { listingId } });
      await queryClient.invalidateQueries({ queryKey: ["saved-listing-ids", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["saved-listings", user.id] });
      toast.success(result.saved ? "Item saved." : "Removed from saved items.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This item could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={saved ? "Remove from saved items" : "Save item"}
      aria-pressed={saved}
      title={saved ? "Remove from saved items" : "Save item"}
      disabled={busy}
      onClick={() => void handleToggle()}
    >
      <Heart aria-hidden="true" className={saved ? "fill-current text-destructive" : undefined} />
    </Button>
  );
}