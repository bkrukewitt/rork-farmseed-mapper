# Add "Try Demo" preview mode with 1 free scan

## What's changing

Add a **Try Demo** option on the paywall so people can try the app before subscribing. They get **1 free scan** of a seed tag, then the paywall reappears when they try to do more.

## Features

- **Try Demo button** on the paywall, placed under the Subscribe button with a short explanation.
- Demo description shown on paywall:
  - ✅ Scan 1 seed tag to see how it works
  - ✅ Browse the map and sample screens
  - ❌ Saving entries, fields, and inventory is locked
  - ❌ Sync and team features are locked
- **1 free scan** — the first time a demo user taps "Scan seed tag QR" or "Scan from photo" it works normally. After that first scan, attempting another scan opens the paywall.
- **Locked actions show the paywall** — trying to save an entry, add a field, add inventory, or edit items will bring up the paywall (same behavior as today, just now reachable from demo).
- **Demo banner** shown at the top of the main screens while in demo mode, with a "Subscribe" shortcut and a scan counter ("1 free scan remaining" / "Demo scan used").
- **Exit demo anytime** from Settings → tapping "Subscribe" opens the paywall; a new "Exit Demo" row ends demo mode.
- Demo state is **remembered across app restarts** so the 1-scan limit can't be bypassed by closing the app.
- Once a user subscribes, demo mode ends automatically and the scan counter resets.

## Design

- **Try Demo button** styled as a subtle secondary button (outline / ghost style) beneath the main Subscribe button so it doesn't compete with the purchase call-to-action.
- Short 2-line helper text above the button: "Just browsing? Try the demo — 1 free seed scan, no account needed."
- **Demo banner** at the top of the home/map screen: soft amber background with a small sparkle icon, text like "Demo mode · 1 free scan left", and a compact "Subscribe" pill on the right.
- When the scan is used, banner switches to "Demo scan used · Subscribe to keep scanning".
- Smooth fade-in for the banner, gentle haptic when the paywall appears from a locked action.

## Screens affected

- **Paywall screen** — adds the Try Demo button and helper text at the bottom.
- **Home / Map screen** — shows the demo banner at the top when in demo mode.
- **Add Entry screen** — allows the first scan; subsequent scans trigger the paywall.
- **Settings screen** — shows demo status and an "Exit Demo" action when active.
- **Onboarding** — unchanged; after onboarding the paywall still appears, but now with the demo option available.
