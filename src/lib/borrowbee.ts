import { CATEGORIES } from "@/lib/borrowbee-config";

export const BRAND = {
  name: "BorrowBee",
  tagline: "Borrow what you need. Earn from what you own.",
  community: "Ajeenkya DY Patil University",
  communityShort: "ADYPU",
  supportEmail: "support@borrowbee.app",
} as const;

export const PLATFORM_FEE_RATE = 0.125;
export const PLATFORM_FEE_LABEL = "12.5%";
export const CURRENCY = { code: "INR", symbol: "₹", locale: "en-IN" } as const;

export function formatMoney(amount: number) {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function estimateEarnings(dailyPrice: number, daysPerMonth: number) {
  const gross = Math.max(0, dailyPrice) * Math.max(0, daysPerMonth);
  const fee = gross * PLATFORM_FEE_RATE;
  return { gross, fee, net: gross - fee };
}

export function priceLabel(listing: Pick<Listing, "daily_rate" | "hourly_rate" | "flat_rate">) {
  if (listing.daily_rate) return `${formatMoney(listing.daily_rate)}/day`;
  if (listing.hourly_rate) return `${formatMoney(listing.hourly_rate)}/hour`;
  if (listing.flat_rate) return `${formatMoney(listing.flat_rate)} flat`;
  return "Price on request";
}

export type Listing = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  category: string;
  condition: string;
  description: string;
  tags: string[];
  hourly_rate: number | null;
  daily_rate: number | null;
  flat_rate: number | null;
  quantity: number;
  deposit: number;
  available: boolean;
  rules: string[];
  agreement_template: string;
  media: Array<{ url: string; type: "image" | "video" }>;
  location: string;
  created_at: string;
};

export const categories = CATEGORIES;

export function categoryName(value: string) {
  return categories.find((category) => category.value === value)?.label ?? "Other";
}

export function primaryImage(listing: Listing | undefined) {
  if (!listing) return "/items/rolling-cooler.jpg";
  const stored = listing.media.find((asset) => asset.type === "image")?.url;
  return stored && (stored.startsWith("/") || stored.startsWith("https://")) ? stored : "/items/rolling-cooler.jpg";
}

export function filterListings(
  listings: Listing[],
  filters: { query?: string; category?: string; location?: string; maxPrice?: string },
) {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  const maximum = filters.maxPrice ? Number(filters.maxPrice) : undefined;

  return listings.filter((listing) => {
    const text = `${listing.title} ${listing.description} ${listing.tags.join(" ")}`.toLocaleLowerCase();
    const itemPrice = listing.daily_rate ?? listing.flat_rate ?? listing.hourly_rate ?? 0;
    return (
      (!query || text.includes(query)) &&
      (!filters.category || listing.category === filters.category) &&
      (!filters.location || listing.location === filters.location) &&
      (maximum === undefined || !Number.isFinite(maximum) || itemPrice <= maximum)
    );
  });
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/browse";
  try {
    const resolved = new URL(value, "https://borrowbee.local");
    return resolved.origin === "https://borrowbee.local" ? `${resolved.pathname}${resolved.search}${resolved.hash}` : "/browse";
  } catch {
    return "/browse";
  }
}
