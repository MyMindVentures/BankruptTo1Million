# Offer Booking Soft-Reservation Design

**Date:** 2026-07-17  
**Status:** Approved for implementation

## Goal

Visitors soft-reserve a calendar-stop exchange offer (optionally linked to a catalogue `offers` row) via a shared booking form. Submissions land in a new private `journey_offer_bookings` table for manual admin review.

## Decisions

- **New table:** `journey_offer_bookings` (do not reuse `journey_exchange_inquiries` or `journey_host_offers`)
- **Primary entity:** `journey_exchange_items` with `item_type = 'offer'`
- **Optional catalogue link:** `offers` via `offers.legacy_exchange_item_id`
- **Booking kind:** soft reservation (preferred dates + group size); no payment; no hard slot locking
- **CTAs:** calendar “What they offer”, `/offers` cards, `/offers/:slug`
- **Hosting:** remains on `journey_host_offers`

## Schema

`journey_offer_bookings`:

| Column | Notes |
|--------|--------|
| `exchange_item_id` | required FK → exchange offer |
| `offer_id` | optional FK → `offers` |
| `calendar_entry_id` | required FK → calendar stop |
| `full_name`, `email`, `phone` | contact; phone optional |
| `preferred_from`, `preferred_until` | soft hold dates |
| `group_size` | optional |
| `message` | required |
| `consent_to_contact` | must be true on insert |
| `status` | `new` \| `reviewed` \| `accepted` \| `declined` \| `cancelled` |
| `internal_notes`, `reviewed_at` | admin |

Insert guards validate public active offer item, calendar consistency, and optional offer link.

## Security

- RLS enabled; no public SELECT
- anon/authenticated INSERT only with consent + guards
- Admins manage via `has_active_admin_access()` and security-definer RPCs

## UI

Shared `JourneyOfferBookingForm` modal. Calendar and offers surfaces open it with resolved IDs. Admin journey calendar page lists and moderates bookings.
