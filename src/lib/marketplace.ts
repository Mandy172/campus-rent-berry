import { queryOptions } from "@tanstack/react-query";
import { getListing, listListings } from "@/lib/marketplace.functions";

export const listingsQueryOptions = (filters: { category?: string; query?: string } = {}) =>
  queryOptions({ queryKey: ["marketplace", filters], queryFn: () => listListings({ data: filters }) });

export const listingQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["listing", id], queryFn: () => getListing({ data: { id } }) });