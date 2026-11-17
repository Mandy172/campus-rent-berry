import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Listing } from "@/lib/borrowbee";

export const listSavedListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: favorites, error } = await context.supabase
      .from("favorites")
      .select("listing_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Your saved items could not be loaded.");
    const ids = (favorites ?? []).map((favorite) => favorite.listing_id);
    if (!ids.length) return [];

    const { data: rows, error: listingError } = await context.supabase
      .from("listings")
      .select("*")
      .in("id", ids)
      .eq("available", true);
    if (listingError) throw new Error("Saved item details could not be loaded.");
    const byId = new Map(((rows ?? []) as Listing[]).map((listing) => [listing.id, listing]));
    const privatePhotos = [...byId.values()].flatMap((listing) =>
      listing.media
        .filter((asset) => !asset.url.startsWith("/") && asset.url.startsWith(`${listing.owner_id}/`))
        .map((asset) => ({ listing, path: asset.url })),
    );
    const signedByPath = new Map<string, string>();
    if (privatePhotos.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = await Promise.all(
        privatePhotos.map(async ({ path }) => {
          const { data } = await supabaseAdmin.storage.from("borrowbee-listings").createSignedUrl(path, 3600);
          return data?.signedUrl ? ([path, data.signedUrl] as const) : null;
        }),
      );
      for (const entry of signed) if (entry) signedByPath.set(entry[0], entry[1]);
    }

    return ids.flatMap((id) => {
      const listing = byId.get(id);
      if (!listing) return [];
      return [{
        ...listing,
        media: listing.media.map((asset) => ({ ...asset, url: signedByPath.get(asset.url) ?? asset.url })),
      }];
    });
  });

export const listSavedListingIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("favorites").select("listing_id");
    if (error) throw new Error("Your saved items could not be loaded.");
    return (data ?? []).map((favorite) => favorite.listing_id);
  });

export const toggleSavedListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => input)
  .handler(async ({ data, context }) => {
    if (typeof data.listingId !== "string" || data.listingId.length > 80) throw new Error("Choose a valid item.");
    const { data: saved, error } = await context.supabase.rpc("toggle_borrowbee_favorite", {
      p_listing_id: data.listingId,
    });
    if (error || saved === null) throw new Error(error?.message ?? "The item could not be saved.");
    return { saved };
  });

export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => input)
  .handler(async ({ data, context }) => {
    if (typeof data.listingId !== "string" || data.listingId.length > 80) throw new Error("Choose a valid item.");
    const { data: conversationId, error } = await context.supabase.rpc("start_borrowbee_conversation", {
      p_listing_id: data.listingId,
    });
    if (error || !conversationId) throw new Error(error?.message ?? "The conversation could not be started.");
    return { conversationId };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conversations, error } = await context.supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Your conversations could not be loaded.");
    const ids = (conversations ?? []).map((conversation) => conversation.id);
    if (!ids.length) return [];
    const listingIds = [...new Set((conversations ?? []).map((conversation) => conversation.listing_id))];
    const [{ data: listings, error: listingError }, { data: messages, error: messagesError }] = await Promise.all([
      context.supabase.from("listings").select("id, title").in("id", listingIds),
      context.supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
    ]);
    if (listingError || messagesError) throw new Error("Your conversation details could not be loaded.");
    const listingsById = new Map((listings ?? []).map((listing) => [listing.id, listing]));
    const latestByConversation = new Map<string, NonNullable<typeof messages>[number]>();
    for (const message of messages ?? []) {
      if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
    }
    return (conversations ?? []).map((conversation) => ({
      ...conversation,
      listing: listingsById.get(conversation.listing_id) ?? null,
      latestMessage: latestByConversation.get(conversation.id) ?? null,
    }));
  });

export const listConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data, context }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.conversationId)) throw new Error("Choose a valid conversation.");
    const { data: conversation, error } = await context.supabase
      .from("conversations")
      .select("id, listing_id, participant1_id, participant2_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conversation) throw new Error("This conversation is not available to your account.");
    const { data: messages, error: messageError } = await context.supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (messageError) throw new Error("Messages could not be loaded.");
    const { data: listing } = await context.supabase
      .from("listings")
      .select("id, title, owner_id, owner_name")
      .eq("id", conversation.listing_id)
      .maybeSingle();
    return { conversation, listing, messages: messages ?? [], currentUserId: context.userId };
  });

export const sendConversationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.conversationId)) throw new Error("Choose a valid conversation.");
    const body = typeof data.body === "string" ? data.body.trim() : "";
    if (body.length < 1 || body.length > 1000) throw new Error("Messages must be between 1 and 1,000 characters.");
    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      sender_id: context.userId,
      body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, href, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Your notifications could not be loaded.");
    return data ?? [];
  });

export const markMyNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error("Your notifications could not be updated.");
    return { ok: true };
  });