import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/borrowbee";
import { daysBetween, rentalQuote } from "@/lib/pricing";

export const listListings = createServerFn({ method: "GET" })
  .inputValidator((input: { category?: string; query?: string }) => input)
  .handler(async ({ data }) => {
    let query = supabase.from("listings").select("*").eq("available", true).order("created_at", { ascending: false });
    if (data.category) query = query.eq("category", data.category);
    const { data: rows, error } = await query;
    if (error) throw new Error("The marketplace could not be loaded.");
    const listings = (rows ?? []) as Listing[];
    if (!data.query?.trim()) return listings;
    const search = data.query.trim().toLocaleLowerCase();
    return listings.filter((listing) => `${listing.title} ${listing.description} ${listing.tags.join(" ")}`.toLocaleLowerCase().includes(search));
  });

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { data: listing, error } = await supabase.from("listings").select("*").eq("id", data.id).eq("available", true).maybeSingle();
    if (error) throw new Error("This item could not be loaded.");
    return (listing as Listing | null) ?? null;
  });

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
    const ownerName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Campus member").slice(0, 60);
    const id = `lst_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
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
    const { data: bookings, error: bookingError } = await context.supabase
      .from("rentals").select("start_date,end_date,quantity")
      .eq("listing_id", data.listingId).in("status", ["pending", "accepted"])
      .lte("start_date", data.endDate).gte("end_date", data.startDate);
    if (bookingError) throw new Error("Availability could not be checked. Please try again.");
    const booked = (bookings ?? []).reduce((total, booking) => total + booking.quantity, 0);
    if (booked + data.quantity > listing.quantity) throw new Error("This item is fully booked for those dates.");
    const quote = rentalQuote(listing as Listing, days, data.quantity);
    const { data: rental, error } = await context.supabase.from("rentals").insert({
      listing_id: data.listingId,
      borrower_id: context.userId,
      owner_id: listing.owner_id,
      start_date: data.startDate,
      end_date: data.endDate,
      days,
      quantity: data.quantity,
      subtotal: quote.subtotal,
      fee: quote.fee,
      deposit: quote.deposit,
      status: "pending",
      note: data.note.trim(),
    }).select("id").single();
    if (error || !rental) throw new Error("Your request could not be sent. Please try again.");
    return { id: rental.id, ...quote, days };
  });