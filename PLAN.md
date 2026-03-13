# Add Subscription Paywall with RevenueCat

## Features

- **Subscription plans**: Monthly and Annual options — no "Pro" branding, just "Seed Tracker" subscription
- **Free preview mode**: Users can browse the app freely (view map, look at existing data) but cannot add or modify any data
- **Paywall on locked actions**: When a user tries to add an entry, add a field, add inventory, upload data, or edit existing items, the paywall appears
- **Paywall on first launch**: After onboarding, the paywall is shown once so users know about the subscription — they can dismiss it to preview the app
- **Restore purchases**: Button on the paywall and in Settings to restore previous purchases
- **Subscription status in Settings**: Shows current plan status and a "Manage Subscription" option

## Locked Actions (require subscription)

- Adding new seed entries
- Adding new fields
- Adding new inventory items
- Uploading fields or inventory from files
- Editing existing entries, fields, or inventory
- Farm sync/sharing features

## Free Actions (no subscription needed)

- Viewing the map with existing pins
- Browsing entries, fields, and inventory lists
- Viewing entry/field/inventory details
- Viewing settings
- Onboarding

## Paywall Design

- **Farm-themed, clean & minimal** — earthy warm background with subtle grain/field texture feel
- Top section: Leaf icon with "Seed Tracker" title and a short tagline like "Track every seed, from bag to field"
- **Three short benefit highlights** with small icons (map pin, camera, sync) — one line each, no long feature lists
- **Plan toggle**: Monthly vs Annual side-by-side cards, annual card shows savings badge
- Prices pulled live from RevenueCat offerings
- Large "Subscribe" button in the app's orange primary color
- "Restore Purchases" link below the button
- Dismissible with an X button so users can preview the app
- Earthy green and warm orange color palette matching the existing app theme

## Settings Changes

- New "Subscription" row showing current status (Active / Not Subscribed)
- Tapping it opens the paywall if not subscribed, or shows manage options if subscribed

## Technical Flow

- RevenueCat SDK integrated and configured at app startup
- Subscription state stored in a shared context so all screens can check access
- All "add" and "edit" buttons check subscription status before navigating — if not subscribed, the paywall opens as a modal instead
- Three RevenueCat store apps will be configured (Test Store, iOS App Store, Android Play Store) with matching environment variables
