import type {Profile} from '@/lib/data';

/** Resolve the public-facing business name from a profile. */
export function displayBusinessName(profile: Profile | null | undefined): string {
  if (!profile) return 'Professional Handyman';
  return (
    profile.business_name?.trim() ||
    profile.full_name?.trim() ||
    'Professional Handyman'
  );
}

/** Single-line location for headers (address and/or city/state). */
export function displayLocation(profile: Profile | null | undefined): string {
  if (!profile) return '';
  const parts = [
    profile.address?.trim(),
    [profile.city?.trim(), profile.state?.trim()].filter(Boolean).join(', '),
    profile.zip?.trim(),
  ].filter(Boolean);
  return parts.join(' · ');
}

export function displayPhone(profile: Profile | null | undefined): string {
  return profile?.phone?.trim() || '';
}

export function displayEmail(profile: Profile | null | undefined): string {
  return profile?.email?.trim() || '';
}

/** HTML snippet for print/PDF quote headers driven entirely by profile. */
export function pdfHeaderHtml(profile: Profile | null | undefined): string {
  const name = displayBusinessName(profile);
  const phone = displayPhone(profile);
  const email = displayEmail(profile);
  const location = displayLocation(profile);
  const tagline = profile?.tagline?.trim() || '';
  const license = profile?.license_number?.trim() || '';
  const logo = profile?.logo_url?.trim() || '';

  const contactBits = [phone, email, location].filter(Boolean).join(' · ');
  const metaBits = [
    tagline ? `<p class="meta">${escapeHtml(tagline)}</p>` : '',
    license ? `<p class="meta">License #${escapeHtml(license)}</p>` : '',
  ]
    .filter(Boolean)
    .join('');

  const logoBlock = logo
    ? `<img src="${escapeHtml(logo)}" alt="" style="max-height:64px;max-width:160px;margin:0 auto 12px;display:block;" />`
    : '';

  return `
    <div class="header">
      ${logoBlock}
      <h1>${escapeHtml(name)}</h1>
      ${contactBits ? `<p class="meta">${escapeHtml(contactBits)}</p>` : ''}
      ${metaBits}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
