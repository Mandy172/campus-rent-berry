import type { Listing } from "@/lib/borrowbee";
import { PLATFORM_FEE_RATE } from "@/lib/borrowbee";

export function daysBetween(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) return 0;
  return Math.round((endTime - startTime) / 86_400_000) + 1;
}

export function rentalQuote(listing: Listing, days: number, quantity: number) {
  let unitTotal = 0;
  if (listing.daily_rate) unitTotal = listing.daily_rate * days;
  else if (listing.flat_rate) unitTotal = listing.flat_rate;
  else if (listing.hourly_rate) unitTotal = listing.hourly_rate * 8 * days;
  const subtotal = Math.round(unitTotal * quantity * 100) / 100;
  const fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  return { subtotal, fee, ownerPayout: subtotal - fee, deposit: listing.deposit * quantity };
}