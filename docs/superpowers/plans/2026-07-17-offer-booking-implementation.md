# Offer Booking Soft-Reservation Implementation Plan

> Copied from the approved execution plan for agent reference.

**Goal:** Soft-reserve calendar-stop exchange offers via a shared booking modal; store in `journey_offer_bookings`; admin review on journey calendar admin.

**Architecture:** Database-first table + RLS + admin RPCs. Shared `JourneyOfferBookingForm`. Resolve `exchange_item_id` ↔ `offer_id` via `offers.legacy_exchange_item_id`.

## Tasks

1. Branch `feature/offer-booking-calendar-flow`
2. Design + plan docs
3. Migration: table, RLS, admin RPCs, i18n keys/registry
4. Prove backend insert + admin RPCs
5. Client API + offers link fields
6. Booking form component
7. Wire calendar CTAs
8. Wire offers pages
9. Admin list/update UI
10. verify:i18n + tests

## Verification

Live insert → modal success → admin list; language switch; no hardcoded visitor strings; hosting unchanged.
