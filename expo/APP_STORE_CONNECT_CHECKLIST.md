# App Store Connect – IAP review checklist (Guideline 2.1b)

Use this when responding to Apple or preparing the next submission.

## 1. App Store Connect – attach IAPs to the binary (manual)

1. Open **App Store Connect** → **My Apps** → **FarmSeed Mapper** → version **1.1.0** (or your current version).
2. Scroll to **In-App Purchases and Subscriptions**.
3. Confirm your **Monthly** and **Annual** auto-renewable subscriptions appear **on this version’s page** (not only under the global **Subscriptions** menu).
4. If they are missing, use **+** to **attach** both products to this version, then save.
5. Confirm both products:
   - Sit in the **same subscription group**
   - Status is **Ready to Submit** or **Waiting for Review**
   - Have localized **display name**, **description**, **price**, and a **review screenshot** where required.
6. Submit for review again if you changed attachments or metadata.

## 2. EAS – RevenueCat API keys in production builds

Keys must exist as **EAS Build** environment variables so they are baked into the binary at compile time (a local `.env` alone does **not** fix a released build).

```bash
cd expo
eas env:list --environment production
```

You should see:

| Variable | Typical prefix |
|----------|----------------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `appl_` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | `goog_` |

If missing, create them (replace values with your keys from RevenueCat):

```bash
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_YOUR_IOS_PUBLIC_KEY --visibility plaintext --type string
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value goog_YOUR_ANDROID_PUBLIC_KEY --visibility plaintext --type string
```

Then rebuild and resubmit:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## 3. App Review Information – Notes (paste into ASC)

Copy this into **App Review Information** → **Notes** for the version under review:

```
The In-App Purchases (FarmSeed Mapper Pro Monthly and Annual) are reachable from two places in the app:

1) First launch:
   - Open the app.
   - On the welcome / permissions screen, tap "Get Started".
   - The paywall ("Seed Tracker") appears immediately. The two purchase options
     are "Annual" (default selected) and "Monthly". Tap one, then tap the
     "Subscribe" button at the bottom. "Restore Purchases" is also available.

2) Anytime from inside the app:
   - From the bottom tab bar, tap the "Settings" tab (right-most icon).
   - Under the "Subscription" section, tap "Subscribe" to re-open the same
     paywall.

There are no storefront, region, A/B-test, or device restrictions on the IAPs.
The app is iPhone-only (supportsTablet=false) and runs in compatibility mode on
iPad. The Account Holder has accepted the Paid Applications Agreement, and
banking and tax information are complete.

No demo account is required to reach the paywall.
```

Adjust product display names in the first paragraph if your App Store Connect names differ.

## 4. Reply to Apple – Resolution Center (paste)

```
Hello,

Thank you for the feedback. Here is how App Review can reach the In-App Purchases (FarmSeed Mapper Pro — Monthly and Annual subscriptions):

Path A — immediately after install:
1. Launch the app.
2. On the welcome screen (permissions overview), tap “Get Started”.
3. The subscription screen (“Seed Tracker” paywall) opens. Choose “Annual” or “Monthly”, then tap “Subscribe”. “Restore Purchases” is available below.

Path B — from anywhere in the app:
1. Open the bottom tab bar and tap “Settings” (right-most tab).
2. Under “Subscription”, tap “Subscribe” to open the same paywall.

There are no storefront, region, or device restrictions that hide these purchases. The app targets iPhone and runs in compatibility mode on iPad (supportsTablet=false). Our Paid Applications Agreement is active and banking/tax are complete.

Purchases use RevenueCat with Apple’s sandbox for review; StoreKit purchase sheets appear after tapping Subscribe.

Please let us know if you need anything else.

Best regards
```

## 5. Paid Apps Agreement

Confirm in **App Store Connect** → **Business** that the **Paid Applications Agreement** is accepted and tax/banking are complete (already noted as done for your account).

---

After code changes in this repo (paywall error states), ship a **new build** so reviewers see explicit loading/retry UI if offerings fail, instead of placeholder prices.
