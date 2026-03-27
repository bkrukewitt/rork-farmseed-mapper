# Security Considerations – FarmSeed Mapper

This document summarizes known security considerations and recommended mitigations. It is intended for developers and for future subscription/backend work.

---

## Critical

### 1. Supabase RLS allows full access to anon

**Current state:** Row Level Security is enabled on `farms`, `farm_members`, and `farm_data`, but all policies use `USING (true) WITH CHECK (true)` for the `anon` role. Anyone with the Supabase anon key can:

- Read, insert, update, and delete any row in `farms`, `farm_members`, and `farm_data`
- Enumerate all farms and all farm data
- Delete any farm or overwrite any data

**Risk:** One leaked or extracted anon key (e.g. from the app bundle) allows full database access. There is no per-farm or per-user isolation at the database level.

**Recommendations:**

- **Short term:** Treat the anon key as public and assume the DB is “open” to anyone who has it. Rely on obscurity of farm IDs and optional farm passwords for light protection only.
- **Medium term:** Introduce real identity (e.g. Supabase Auth or your own auth) and RLS policies that restrict access by `auth.uid()` or by farm membership. For example:
  - `farms`: allow read/update only for rows where the user is in `farm_members` for that farm; allow insert only for “create farm” flows you define.
  - `farm_members`: allow read/insert/update/delete only when the operation is allowed for that farm (e.g. user is admin or is adding themselves with the correct farm password).
  - `farm_data`: allow read/write only for users who are members of the corresponding farm.
- **Operational:** Rotate the anon key if it is ever exposed; use environment variables (e.g. `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`) so keys can be changed without code changes.

---

## High

### 2. Farm passwords stored and compared in plaintext

**Current state:** Farm passwords are stored in `farms.password` as plaintext and compared in the app. They are sent over HTTPS but are visible in the database and in any DB backup or dump.

**Risk:** Database compromise or insider access exposes all farm passwords.

**Recommendations:**

- Hash farm passwords (e.g. bcrypt or Argon2) before storing. Store only the hash in `farms.password`.
- On join, compare the user-provided password to the hash (never store or compare plaintext).
- Optionally add a server-side join endpoint that checks the password and returns a short-lived token or sets a cookie so the client never sends the password repeatedly.

---

### 3. Supabase URL and anon key in source code

**Current state:** `lib/supabase.ts` hardcodes the Supabase URL and anon key.

**Risk:** Keys are in version control and in every build; rotation requires a code change and redeploy. Anyone with repo or binary access can extract them.

**Recommendations:**

- Move to environment variables (e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) and set them in EAS / CI so they are not committed.
- Keep using the anon key for client-side access; real access control should come from RLS and auth, not key secrecy.

---

## Medium

### 4. Admin and Debug PINs are hardcoded in the client

**Current state:** Admin PIN `9876` and Debug PIN `1111` are in `app/admin-menu.tsx`. They are present in the app bundle and can be extracted (e.g. via decompilation or string search).

**Risk:** Anyone with the app binary can obtain the PINs and access admin/debug features (e.g. delete any farm, force-delete inventory, purge and resync).

**Recommendations:**

- Treat these as “convenience” locks, not real security. Document that they only protect against casual users.
- For real admin control, protect destructive actions behind a backend (e.g. authenticated admin API or Supabase service role) and do not rely on client-side PINs for anything sensitive.
- Optionally load PINs from environment or a remote config so they can be changed without a new release (still client-side, so still bypassable; this only raises the bar slightly).

---

### 5. Device ID is the sole “identity” for farm membership

**Current state:** `device_id` is generated client-side and stored in AsyncStorage. It is used to identify the device in `farm_members` and for sync.

**Risk:** On a rooted/jailbroken device, AsyncStorage can be read or modified. A new device could adopt another device’s `device_id` and effectively impersonate it for that farm (e.g. gain admin if that device was admin).

**Recommendations:**

- Treat device_id as a best-effort identifier, not cryptographically strong identity.
- When you add proper auth (e.g. Supabase Auth), tie farm membership to user accounts and use device_id only as a secondary hint (e.g. for “devices” list), not as the primary key for access control.

---

## Lower / Informational

### 6. Grandfathering (originalAppVersion) is client-only

**Current state:** `originalAppVersion` is stored in AsyncStorage and never overwritten. `isGrandfathered()` is true if that key is set.

**Risk:** Users can clear app data or reinstall and get a “fresh” device without `originalAppVersion`, so they might be treated as new users when you add subscriptions. Conversely, on some devices, storage could be tampered to set the key and appear grandfathered.

**Recommendations:**

- Use grandfathering for a **soft** gate (e.g. “thank you” messaging or optional paywall), not as the only check for paid access.
- For a **hard** paywall, back entitlement with a server (e.g. “has active subscription” or “purchase record” in your backend) and use `originalAppVersion` only as a hint or for legacy users you’ve explicitly migrated to the backend.

---

### 7. No rate limiting on farm create/join

**Current state:** Create farm and join farm are called directly from the client to Supabase. There is no application-level rate limiting in the code.

**Risk:** Automated scripts could create many farms or attempt many join/password guesses (especially if farm IDs or passwords are predictable).

**Recommendations:**

- Rely on Supabase rate limiting and quotas where available.
- When you add a backend or Edge Functions, add rate limits (e.g. per IP or per device_id) on create farm and join farm.
- Encourage or enforce strong, unique farm IDs and optional passwords to reduce guessability.

---

### 8. Export and sharing of data

**Current state:** Users can export data (e.g. Excel, JSON) and share files via the system share sheet. Data stays on device or goes where the user sends it.

**Risk:** Exported files may contain PII or sensitive farm data. Risk is mostly from user behavior (e.g. sharing to the wrong place). No evidence of data being sent to your servers beyond Supabase.

**Recommendations:**

- In-app: avoid logging full export contents; log only “export completed” and maybe row counts.
- In privacy policy or in-app copy, remind users that exported data is under their control and they should share it only with trusted parties.

---

## Checklist for future work

- [ ] Move Supabase URL and anon key to environment variables.
- [ ] Implement Supabase Auth (or equivalent) and RLS policies that restrict access by user and farm membership.
- [ ] Hash farm passwords and verify against hashes on join (and/or move join to a backend that does this).
- [ ] Do not rely on client-side admin/debug PINs for sensitive operations; use backend or service role for real admin actions.
- [ ] When adding subscriptions, back entitlement with server-side state; use `originalAppVersion` only as a legacy/UX hint.
- [ ] Add rate limiting (Supabase or backend) for create farm, join farm, and any other sensitive or expensive operations.
- [ ] Keep dependencies up to date and run `npm audit` / equivalent periodically.

---

*Last updated: 2025 (add date when you change this file).*
