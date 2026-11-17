import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/borrowbee";
import { daysBetween, rentalQuote } from "@/lib/pricing";

export const listListings = createServerFn({ method: "GET" })
  .inputValidator((input: { category?: string; query?: string }) => input)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.from("listings").select("*").eq("available", true).order("created_at", { ascending: false });
    if (error) throw new Error("The marketplace could not be loaded.");
    const listings = (rows ?? []) as Listing[];
    const withPhotos = await Promise.all(listings.map(async (listing) => ({ ...listing, media: await signListingImages(listing) })));
    if (!data.query?.trim()) return withPhotos;
    const search = data.query.trim().toLocaleLowerCase();
    return withPhotos.filter((listing) => `${listing.title} ${listing.description} ${listing.tags.join(" ")}`.toLocaleLowerCase().includes(search));
  });

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { data: listing, error } = await supabase.from("listings").select("*").eq("id", data.id).eq("available", true).maybeSingle();
    if (error) throw new Error("This item could not be loaded.");
    if (!listing) return null;
    const row = listing as Listing;
    return { ...row, media: await signListingImages(row) };
  });

async function signListingImages(listing: Listing): Promise<Listing["media"]> {
  const photos = listing.media.filter((asset) => !asset.url.startsWith("/") && asset.url.startsWith(`${listing.owner_id}/`));
  if (!photos.length) return listing.media;
  const signed = await Promise.all(photos.map(async (photo) => {
    const { data, error } = await supabase.storage.from("borrowbee-listings").createSignedUrl(photo.url, 3600);
    if (error) return [photo.url, null] as const;
    return [photo.url, data.signedUrl] as const;
  }));
  const signedByPath = new Map(signed.filter((entry): entry is readonly [string, string] => typeof entry[1] === "string"));
  return listing.media.map((photo) => ({ ...photo, url: signedByPath.get(photo.url) ?? photo.url }));
}

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; category: string; dailyRate: number; location: string; description: string; media: Listing["media"] }) => input)
  .handler(async ({ data, context }) => {
    const title = data.title.trim();
    if (title.length < 3 || title.length > 90) throw new Error("Enter an item name between 3 and 90 characters.");
    if (!Number.isFinite(data.dailyRate) || data.dailyRate < 1 || data.dailyRate > 1_000_000) throw new Error("Enter a daily price greater than zero.");
    if (data.description.trim().length < 10 || data.description.length > 2000) throw new Error("Add a description between 10 and 2,000 characters.");
    if (!data.media.length || data.media.length > 10) throw new Error("Add one to ten item photos.");
    const { data: authData } = await context.supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error("Sign in to list an item.");
    const metadata = user.user_metadata as Record<string, unknown>;
    const ownerName = String(metadata["full_name"] ?? metadata["name"] ?? user.email?.split("@")[0] ?? "Campus member").slice(0, 60);
    const id = `lst_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    if (data.media.some((asset) => !asset.url.startsWith(`${context.userId}/`) || asset.url.startsWith("/") || asset.url.includes(".."))) {
      throw new Error("The uploaded photo does not belong to your account.");
    }
    const { error } = await context.supabase.from("listings").insert({
      id,
      owner_id: context.userId,
      owner_name: ownerName,
      title,
      category: data.category,
      condition: "Good",
      description: data.description.trim(),
      tags: [],
      daily_rate: data.dailyRate,
      quantity: 1,
      deposit: 0,
      rules: ["Return clean and on time", "No subletting", "Report any damage right away"],
      agreement_template: "standard",
      media: data.media,
      location: data.location,
    });
    if (error) throw new Error("Your item could not be saved. Please try again.");
    return { id };
  });

export const requestRental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; startDate: string; endDate: string; quantity: number; note: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: listing, error: listingError } = await context.supabase
      .from("listings").select("*").eq("id", data.listingId).eq("available", true).maybeSingle();
    if (listingError || !listing) throw new Error("This item is not available right now.");
    if (listing.owner_id === context.userId) throw new Error("You cannot rent your own item.");
    const days = daysBetween(data.startDate, data.endDate);
    if (data.startDate < new Date().toISOString().slice(0, 10) || days < 1 || days > 60) {
      throw new Error("Choose dates from today through the next 60 days.");
    }
    if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > Math.min(listing.quantity, 99)) {
      throw new Error("The quantity is not available.");
    }
    if (data.note.trim().length > 500) throw new Error("Keep your note under 500 characters.");
    const quote = rentalQuote(listing as Listing, days, data.quantity);
    const { data: rentalId, error } = await context.supabase.rpc("create_rental_request", {
      p_listing_id: data.listingId,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_quantity: data.quantity,
      p_note: data.note.trim(),
    });
    if (error || !rentalId) throw new Error(error?.message ?? "Your request could not be sent. Please try again.");
    return { id: rentalId, ...quote, days };
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("listings").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error("Your items could not be loaded.");
    return Promise.all(((data ?? []) as Listing[]).map(async (listing) => ({ ...listing, media: await signListingImages(listing) })));
  });

export const setListingAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; available: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("listings").update({ available: data.available }).eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error("The listing could not be updated.");
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("listings").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error("The listing could not be removed.");
    return { ok: true };
  });

export const listMyRentals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rentals, error } = await context.supabase.from("rentals").select("*").order("created_at", { ascending: false });
    if (error) throw new Error("Your rental requests could not be loaded.");
    const ids = [...new Set((rentals ?? []).map((rental) => rental.listing_id))];
    const { data: listings, error: listingError } = ids.length
      ? await context.supabase.from("listings").select("*").in("id", ids)
      : { data: [], error: null };
    if (listingError) throw new Error("Rental item details could not be loaded.");
    const byId = new Map(((listings ?? []) as Listing[]).map((listing) => [listing.id, listing]));
    return Promise.all((rentals ?? []).map(async (rental) => {
      const item = byId.get(rental.listing_id);
      const withPhoto = item ? { ...item, media: await signListingImages(item) } : null;
      return { ...rental, side: rental.borrower_id === context.userId ? "borrower" as const : "owner" as const, listing: withPhoto };
    }));
  });

export const respondToRental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; action: "cancel" | "accept" | "decline" }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("respond_to_rental", { p_rental_id: data.id, p_action: data.action });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStripeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) return { configured: false, connected: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin.from("payout_accounts").select("stripe_account_id,connected").eq("owner_id", context.userId).maybeSingle();
    return { configured: true, connected: account?.connected ?? false };
  });

export const connectStripeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Stripe payout setup is not configured yet.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("payout_accounts").select("stripe_account_id").eq("owner_id", context.userId).maybeSingle();
    let accountId = existing?.stripe_account_id;
    if (!accountId) {
      const created = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ type: "express" }),
      });
      if (!created.ok) throw new Error("Stripe could not create your payout account. Try again later.");
      const account = await created.json() as { id?: string };
      if (!account.id) throw new Error("Stripe could not create your payout account. Try again later.");
      accountId = account.id;
      const { error } = await supabaseAdmin.from("payout_accounts").upsert({ owner_id: context.userId, stripe_account_id: accountId, connected: false, updated_at: new Date().toISOString() });
      if (error) throw new Error("Your payout setup could not be saved. Try again later.");
    }
    const origin = new URL((await import("@tanstack/react-start/server")).getRequest().url).origin;
    const returnUrl = `${origin}/my-listings?stripe=refresh`;
    const linkResponse = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ account: accountId, refresh_url: returnUrl, return_url: returnUrl, type: "account_onboarding" }),
    });
    if (!linkResponse.ok) throw new Error("Stripe could not open payout setup. Try again later.");
    const link = await linkResponse.json() as { url?: string };
    if (!link.url) throw new Error("Stripe could not open payout setup. Try again later.");
    return { url: link.url };
  });

export const refreshStripeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) throw new Error("Stripe payout setup is not configured yet.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin.from("payout_accounts").select("stripe_account_id").eq("owner_id", context.userId).maybeSingle();
    if (!account) return { connected: false };
    const result = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(account.stripe_account_id)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!result.ok) throw new Error("Payout setup could not be checked. Try again later.");
    const state = await result.json() as { charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean };
    const connected = state.charges_enabled === true && state.payouts_enabled === true && state.details_submitted === true;
    const { error } = await supabaseAdmin.from("payout_accounts").update({ connected, updated_at: new Date().toISOString() }).eq("owner_id", context.userId);
    if (error) throw new Error("Your payout status could not be saved.");
    return { connected };
  });