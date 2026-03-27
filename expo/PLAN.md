# Add Subscription Paywall with RevenueCat

## Features

- [x] **Subscription plans**: Monthly and Annual options — no "Pro" branding, just "Seed Tracker" subscription
- [x] **Free preview mode**: Users can browse the app freely (view map, look at existing data) but cannot add or modify any data
- [x] **Paywall on locked actions**: When a user tries to add an entry, add a field, add inventory, upload data, or edit existing items, the paywall appears
- [x] **Paywall on first launch**: After onboarding, the paywall is shown once so users know about the subscription — they can dismiss it to preview the app
- [x] **Restore purchases**: Button on the paywall and in Settings to restore previous purchases
- [x] **Subscription status in Settings**: Shows current plan status and a "Manage Subscription" option

## Locked Actions (require subscription)

- [x] Adding new seed entries
- [x] Adding new fields
- [x] Adding new inventory items
- [x] Uploading fields or inventory from files
- [x] Editing existing entries, fields, or inventory
- [x] Farm sync/sharing features

## Free Actions (no subscription needed)

- [x] Viewing the map with existing pins
- [x] Browsing entries, fields, and inventory lists
- [x] Viewing entry/field/inventory details
- [x] Viewing settings
- [x] Onboarding

## Paywall Design

- [x] **Farm-themed, clean & minimal** — earthy warm background with subtle grain/field texture feel
- [x] Top section: Leaf icon with "Seed Tracker" title and a short tagline like "Track every seed, from bag to field"
- [x] **Three short benefit highlights** with small icons (map pin, camera, sync) — one line each, no long feature lists
- [x] **Plan toggle**: Monthly vs Annual side-by-side cards, annual card shows savings badge
- [x] Prices pulled live from RevenueCat offerings
- [x] Large "Subscribe" button in the app's orange primary color
- [x] "Restore Purchases" link below the button
- [x] Dismissible with an X button so users can preview the app
- [x] Earthy green and warm orange color palette matching the existing app theme

## Settings Changes

- [x] New "Subscription" row showing current status (Active / Not Subscribed)
- [x] Tapping it opens the paywall if not subscribed, or shows manage options if subscribed

## Technical Flow

- [x] RevenueCat SDK integrated and configured at app startup
- [x] Subscription state stored in a shared context so all screens can check access
- [x] All "add" and "edit" buttons check subscription status before navigating — if not subscribed, the paywall opens as a modal instead
- [x] Three RevenueCat store apps will be configured (Test Store, iOS App Store, Android Play Store) with matching environment variables
