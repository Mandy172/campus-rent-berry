import { describe, expect, it } from "vitest";
import { estimateEarnings, PLATFORM_FEE_RATE } from "@/lib/borrowbee";
import { daysBetween, rentalQuote } from "@/lib/pricing";
import type { Listing } from "@/lib/borrowbee";

describe("BorrowBee pricing", () => {
  it("keeps the platform fee at 12.5%", () => {
    expect(PLATFORM_FEE_RATE).toBe(0.125);
  });

  it("estimates ₹400 per day for 6 days as ₹2,100 after the 12.5% fee", () => {
    expect(estimateEarnings(400, 6)).toEqual({ gross: 2400, fee: 300, net: 2100 });
  });

  it("includes both the first and last rental days", () => {
    expect(daysBetween("2026-11-20", "2026-11-21")).toBe(2);
  });

  it("calculates a 2-day rental and the 12.5% fee from the listed daily price", () => {
    const listing = {
      daily_rate: 900,
      hourly_rate: null,
      flat_rate: null,
      deposit: 1500,
    } as Listing;
    expect(rentalQuote(listing, 2, 1)).toEqual({ subtotal: 1800, fee: 225, ownerPayout: 1575, deposit: 1500 });
  });

  it("keeps the 12.5% platform fee concrete for a ₹900 two-day booking", () => {
    const listing = { daily_rate: 900, hourly_rate: null, flat_rate: null, deposit: 0 } as Listing;
    expect(rentalQuote(listing, 2, 1).fee).toBe(225);
  });
});