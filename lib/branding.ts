import { createServerSupabase } from './supabase/server';

export type Branding = {
  logoUrl: string;
  brandColor: string;
  faviconUrl: string;
  footerText: string;
  footerUrl: string;
  hideFelloMark: boolean;
};

export type BrandingInput = Omit<Branding, 'hideFelloMark'> & { hideFelloMark: boolean };

function httpsUrl(raw: string, code: string): string | null {
  const value = raw.trim();
  if (value === '') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(code);
  }
  if (url.protocol !== 'https:' || value.length > 500) throw new Error(code);
  return url.toString();
}

/** Checks and tidies branding values. Throws logo_url_invalid, favicon_url_invalid, footer_url_invalid, color_invalid or footer_too_long. */
export function normalizeBranding(input: BrandingInput) {
  const color = input.brandColor.trim().toLowerCase();
  if (color !== '' && !/^#[0-9a-f]{6}$/.test(color)) throw new Error('color_invalid');
  const footer = input.footerText.replace(/\s+/g, ' ').trim();
  if (footer.length > 200) throw new Error('footer_too_long');
  return {
    logo_url: httpsUrl(input.logoUrl, 'logo_url_invalid'),
    brand_color: color === '' ? null : color,
    favicon_url: httpsUrl(input.faviconUrl, 'favicon_url_invalid'),
    room_footer_text: footer,
    room_footer_url: httpsUrl(input.footerUrl, 'footer_url_invalid'),
    hide_fello_mark: input.hideFelloMark,
  };
}

export async function getBranding(workspaceId: string): Promise<Branding> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('workspaces')
    .select('logo_url, brand_color, favicon_url, room_footer_text, room_footer_url, hide_fello_mark')
    .eq('id', workspaceId)
    .maybeSingle();
  return {
    logoUrl: (data?.logo_url as string | null) ?? '',
    brandColor: (data?.brand_color as string | null) ?? '',
    faviconUrl: (data?.favicon_url as string | null) ?? '',
    footerText: (data?.room_footer_text as string | null) ?? '',
    footerUrl: (data?.room_footer_url as string | null) ?? '',
    hideFelloMark: Boolean(data?.hide_fello_mark),
  };
}

/** Saves branding. Only workspace admins pass the database's access rules. */
export async function saveBranding(workspaceId: string, input: BrandingInput): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('workspaces').update(normalizeBranding(input)).eq('id', workspaceId).select('id');
  if (error) throw new Error('branding_failed');
  if (!data || data.length === 0) throw new Error('not_allowed');
}
