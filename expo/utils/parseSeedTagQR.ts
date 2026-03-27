import { PRODUCER_OPTIONS } from '@/types';

export interface ParsedSeedTagQR {
  producer?: string;
  varietyName?: string;
  lotNumber?: string;
  germinationPercent?: string;
  notes?: string;
}

/**
 * Parse raw QR content (URL or plain text) into entry-relevant fields.
 * Best-effort; never throws. Prefer leaving a field empty over guessing wrong.
 */
export function parseSeedTagQR(raw: string): ParsedSeedTagQR {
  const result: ParsedSeedTagQR = {};
  const trimmed = raw.trim();
  if (!trimmed) return result;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return parseUrlContent(trimmed, result);
    }
    return parsePlainText(trimmed, result);
  } catch {
    result.notes = trimmed;
    return result;
  }
}

function parseUrlContent(url: string, result: ParsedSeedTagQR): ParsedSeedTagQR {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const params = u.searchParams;

    // Try common query params
    const lot = params.get('lot') || params.get('lotNumber') || params.get('lot_number');
    if (lot) result.lotNumber = String(lot).trim();

    const variety = params.get('variety') || params.get('varietyName') || params.get('product') || params.get('sku');
    if (variety) result.varietyName = String(variety).trim();

    const germ = params.get('germination') || params.get('germ');
    if (germ) result.germinationPercent = String(germ).trim().replace(/\s*%\s*$/, '') + (/\d+$/.test(String(germ).trim()) ? '' : '%');

    // Try path segments for product/variety (e.g. /product/P1234, /pioneer/P1234)
    const pathParts = path.split('/').filter(Boolean);
    for (const part of pathParts) {
      if (isLikelyVarietyCode(part) && !result.varietyName) {
        result.varietyName = part;
        break;
      }
    }

    // Producer hint from hostname
    const host = u.hostname.toLowerCase();
    if (host.includes('pioneer')) result.producer = 'Pioneer';
    else if (host.includes('bayer') || host.includes('dekalb') || host.includes('cropscience')) result.producer = 'Bayer/DeKalb';
    else if (host.includes('asgrow')) result.producer = 'Asgrow';
    else if (host.includes('becks')) result.producer = "Beck's";
    else if (host.includes('channel')) result.producer = 'Channel';
    else if (host.includes('goldenharvest')) result.producer = 'Golden Harvest';
    else if (host.includes('nk')) result.producer = 'NK';
    else if (host.includes('lgseeds')) result.producer = 'LG Seeds';
    else if (host.includes('stine')) result.producer = 'Stine';
    else if (host.includes('wyffels')) result.producer = 'Wyffels';

    result.notes = url;
    return result;
  } catch {
    result.notes = url;
    return result;
  }
}

function parsePlainText(text: string, result: ParsedSeedTagQR): ParsedSeedTagQR {
  // Lot: LOT-xxx, Lot xxx, lot: xxx
  const lotMatch = text.match(/\b(?:lot[-:\s]*)([A-Za-z0-9\-]+)/i) ?? text.match(/\b(LOT[-]?[A-Za-z0-9\-]+)/i);
  if (lotMatch) result.lotNumber = lotMatch[1].trim();

  // Germination: XX% or XX percent
  const germMatch = text.match(/\b(\d{1,3})\s*%?\s*(?:germination|germ)?/i) ?? text.match(/(\d{1,3})\s*%/);
  if (germMatch) result.germinationPercent = germMatch[1] + '%';

  // Producer: match known options (case-insensitive, allow partial)
  const lower = text.toLowerCase();
  for (const producer of PRODUCER_OPTIONS) {
    const p = String(producer).toLowerCase().replace(/\s+/g, '');
    const normalized = producer.toLowerCase();
    if (lower.includes(normalized) || lower.includes(p) || lower.includes('dekalb') && producer === 'Bayer/DeKalb') {
      result.producer = producer === "Beck's" ? "Beck's" : producer;
      break;
    }
  }

  // Variety: common patterns like P1234, DK4567, alphanumeric codes
  const varietyMatch = text.match(/\b([A-Z]{1,3}\d{4,6}[A-Za-z0-9]*)\b/) ?? text.match(/\b([A-Z][a-z]+\s*[A-Z]?\d{3,}[A-Za-z0-9]*)\b/);
  if (varietyMatch && !result.varietyName) result.varietyName = varietyMatch[1].trim();

  // If we still have substantial text and no notes, put remainder in notes (avoid duplicating full text)
  const used = [result.lotNumber, result.germinationPercent, result.producer, result.varietyName].filter(Boolean).join(' ');
  const remainder = text.replace(/\s+/g, ' ').trim();
  if (remainder.length > 20 && (remainder !== used.trim())) result.notes = remainder;

  return result;
}

function isLikelyVarietyCode(s: string): boolean {
  if (s.length < 4 || s.length > 20) return false;
  return /^[A-Za-z]{1,4}\d{3,}[A-Za-z0-9]*$/.test(s) || /^[A-Z][a-z]+\d+/.test(s);
}
