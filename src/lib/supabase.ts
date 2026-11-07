import { createClient } from '@supabase/supabase-js';

const DIRECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hvnxspbltdmctugcsnmn.supabase.co';

const PROXY_URL = 'https://wishlist-api.pages.dev';

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_eA3CdeXBbog9iS2sBETpuQ_wBIHRXIe';

export const supabaseUrl = DIRECT_URL;

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project')
  );
};

/**
 * Resilient fetch with automatic proxy fallback:
 * In Russia, mobile carriers block direct *.supabase.co connections.
 * This proxy transparently routes all Supabase queries via Cloudflare Pages (wishlist-api.pages.dev)
 * with a 4s timeout. If the proxy fails, it safely falls back to direct.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  let url: string;

  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as Request).url;
  } else {
    url = String(input);
  }

  const proxiedUrl = url.includes('supabase.co')
    ? url.replace(/https:\/\/[^/]+\.supabase\.co/, PROXY_URL)
    : url;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(proxiedUrl, {
      ...(init || {}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status < 500) {
      return res;
    }
  } catch (err) {
    console.warn('Proxy fetch failed or timed out, trying direct:', err);
  }

  return fetch(input, init);
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        fetch: resilientFetch,
      },
    })
  : null;
