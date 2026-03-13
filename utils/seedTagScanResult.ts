/**
 * Holder for the last scanned seed tag QR raw string.
 * Scanner screen writes here; add-entry reads and clears on focus.
 */
let lastScannedRaw: string | null = null;

export function setSeedTagScanResult(raw: string): void {
  lastScannedRaw = raw;
}

export function getAndClearSeedTagScanResult(): string | null {
  const raw = lastScannedRaw;
  lastScannedRaw = null;
  return raw;
}
