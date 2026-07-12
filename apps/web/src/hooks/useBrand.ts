import { useEffect, useState } from 'react';
import { platformSettingsApi } from '../lib/api';
import { getBrandInitials, resolveAssetUrl, type PublicBrand } from '../lib/api/mappers';

const FALLBACK_BRAND: PublicBrand = {
  platformName: 'GymFlow',
  logoUrl: null,
  faviconUrl: null,
  supportEmail: 'support@gymflow.io',
  supportPhone: null,
  website: null,
  primaryColor: '#2563EB',
  accentColor: '#2563EB',
};

/**
 * Fetches platform admin's Global Settings identity (name, logo, support
 * contact, brand colors) from the unauthenticated public brand endpoint.
 * Falls back to GymFlow defaults if the endpoint is unreachable, so every
 * consumer (landing page, workspace sidebar, organizations page) degrades
 * the same way instead of each hardcoding its own fallback.
 */
export function useBrand() {
  const [brand, setBrand] = useState<PublicBrand>(FALLBACK_BRAND);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await platformSettingsApi.getPublicBrand();
        if (!cancelled && raw && raw.platformName) {
          setBrand({
            platformName: raw.platformName,
            logoUrl: raw.logoUrl || null,
            faviconUrl: raw.faviconUrl || null,
            supportEmail: raw.supportEmail || null,
            supportPhone: raw.supportPhone || null,
            website: raw.website || null,
            primaryColor: raw.primaryColor || FALLBACK_BRAND.primaryColor,
            accentColor: raw.accentColor || FALLBACK_BRAND.accentColor,
          });
        }
      } catch {
        // Public brand endpoint unreachable — keep the fallback identity.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    brand,
    logoUrl: resolveAssetUrl(brand.logoUrl),
    initials: getBrandInitials(brand.platformName),
    faviconUrl: resolveAssetUrl(brand.faviconUrl)
  };
}
