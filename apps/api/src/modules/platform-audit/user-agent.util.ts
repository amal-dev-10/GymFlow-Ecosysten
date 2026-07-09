// Same device/browser detection convention as auth.service.ts's
// parseUserAgent, extended with OS detection for PLT-010's Event Details
// (that field isn't needed by auth.service.ts, so it lives here instead of
// being factored out into a shared util both would need to import).

export interface ParsedUserAgent {
  device: string;
  browser: string;
  os: string;
}

export function parseUserAgentFull(uaStr?: string | null): ParsedUserAgent {
  const lowercase = (uaStr || '').toLowerCase();

  let device = 'Desktop';
  if (lowercase.includes('mobile') || lowercase.includes('android') || lowercase.includes('iphone')) {
    device = 'Mobile';
  } else if (lowercase.includes('ipad') || lowercase.includes('tablet')) {
    device = 'Tablet';
  }

  let browser = 'Chrome';
  if (lowercase.includes('firefox')) browser = 'Firefox';
  else if (lowercase.includes('safari') && !lowercase.includes('chrome')) browser = 'Safari';
  else if (lowercase.includes('edge')) browser = 'Edge';
  else if (lowercase.includes('opera')) browser = 'Opera';

  let os = 'Unknown';
  if (lowercase.includes('windows')) os = 'Windows';
  else if (lowercase.includes('mac os') || lowercase.includes('macintosh')) os = 'macOS';
  else if (lowercase.includes('android')) os = 'Android';
  else if (lowercase.includes('iphone') || lowercase.includes('ipad') || lowercase.includes('ios')) os = 'iOS';
  else if (lowercase.includes('linux')) os = 'Linux';

  return { device, browser, os };
}
