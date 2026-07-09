// PLT-010 Audit Center location heuristic. This is a deterministic LOCAL
// lookup, not a real GeoIP integration - no network call, no new dependency.
// Documented as a stub pending a real GeoIP provider. Demo seed data uses
// RFC 5737 TEST-NET ranges (203.0.113.x, 198.51.100.x, 192.0.2.x), which are
// mapped to fixed countries below for consistent demo output; anything else
// falls back to a deterministic hash so the same IP always resolves the
// same way.

const TEST_NET_PREFIXES: Record<string, string> = {
  '203.0.113.': 'United States',
  '198.51.100.': 'United Kingdom',
  '192.0.2.': 'India',
};

const COUNTRY_POOL = [
  'United States', 'United Kingdom', 'India', 'Canada', 'Germany', 'Australia',
  'Singapore', 'United Arab Emirates', 'Brazil', 'Netherlands', 'Japan', 'South Africa',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic local IP -> country resolution. Never returns null for a non-empty ip. */
export function resolveCountry(ipAddress?: string | null): string | undefined {
  if (!ipAddress) return undefined;
  for (const [prefix, country] of Object.entries(TEST_NET_PREFIXES)) {
    if (ipAddress.startsWith(prefix)) return country;
  }
  return COUNTRY_POOL[hashString(ipAddress) % COUNTRY_POOL.length];
}
