/**
 * MAX Messenger WebApp Bridge Utilities
 * Compatible with MAX Bridge (max-web-app.js / window.WebApp)
 */

export interface MaxUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface MaxWebApp {
  initData?: string;
  initDataUnsafe?: {
    query_id?: string;
    auth_date?: number;
    hash?: string;
    start_param?: string;
    user?: MaxUser;
    chat?: {
      id: number;
      type: 'DIALOG' | 'CHAT' | 'CHANNEL';
    };
  };
  platform?: 'ios' | 'android' | 'desktop' | 'web';
  version?: string;
  deviceName?: string;
  HapticFeedback?: {
    impactOccurred: (
      style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
      disableVibrationFallback?: boolean
    ) => Promise<void> | void;
    notificationOccurred: (
      type: 'error' | 'success' | 'warning',
      disableVibrationFallback?: boolean
    ) => Promise<void> | void;
    selectionChanged: (disableVibrationFallback?: boolean) => Promise<void> | void;
  };
  openLink?: (url: string) => void;
  openMaxLink?: (url: string) => void;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
    maxClient?: MaxWebApp;
  }
}

/**
 * Returns the MAX WebApp instance if running inside MAX
 */
export function getMaxWebApp(): MaxWebApp | null {
  if (typeof window === 'undefined') return null;
  // MAX Bridge exposes window.WebApp directly, or inside window.maxClient
  // We make sure it is not confused with Telegram (window.Telegram.WebApp)
  const app = window.WebApp || window.maxClient;
  return app || null;
}

/**
 * Check if the application is opened inside MAX
 */
export function isMaxWebApp(): boolean {
  if (typeof window === 'undefined') return false;

  const max = getMaxWebApp();
  if (max?.initDataUnsafe?.user || max?.platform || max?.deviceName) {
    return true;
  }

  const ua = (window.navigator?.userAgent || '').toLowerCase();
  if (ua.includes('max') || ua.includes('maxmessenger') || ua.includes('maxapp')) {
    return true;
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (
      searchParams.get('platform') === 'max' ||
      searchParams.has('max_user_id') ||
      searchParams.has('max_user')
    ) {
      return true;
    }

    if (window.location.hash) {
      const hash = window.location.hash.replace(/^[#?]/, '');
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get('platform') === 'max' || hashParams.has('max_user_id')) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Get current MAX user profile if available
 */
export function getMaxUser(): MaxUser | null {
  if (typeof window === 'undefined') return null;

  const max = getMaxWebApp();

  // 1. Direct object from MAX Bridge: window.WebApp.initDataUnsafe.user
  if (max?.initDataUnsafe?.user && max.initDataUnsafe.user.id) {
    return max.initDataUnsafe.user;
  }

  // 2. Parse initData query string if present
  if (max?.initData) {
    try {
      const searchParams = new URLSearchParams(max.initData);
      const userRaw = searchParams.get('user');
      if (userRaw) {
        return JSON.parse(decodeURIComponent(userRaw)) as MaxUser;
      }
    } catch {
      // ignore
    }
  }

  // 3. Check URL query parameters (?max_user_id=... or ?user=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const maxUserId = searchParams.get('max_user_id') || (searchParams.get('platform') === 'max' ? searchParams.get('user_id') : null);
    if (maxUserId) {
      return {
        id: maxUserId,
        first_name: searchParams.get('max_first_name') || searchParams.get('first_name') || 'Пользователь MAX',
        last_name: searchParams.get('max_last_name') || searchParams.get('last_name') || undefined,
        username: searchParams.get('max_username') || searchParams.get('username') || undefined,
        photo_url: searchParams.get('max_photo_url') || searchParams.get('photo_url') || undefined,
      };
    }

    const rawUserJson = searchParams.get('max_user');
    if (rawUserJson) {
      return JSON.parse(decodeURIComponent(rawUserJson)) as MaxUser;
    }
  } catch {
    // ignore
  }

  // 4. Check URL hash parameters (#tgWebAppData= or #maxWebAppData=)
  if (window.location.hash) {
    try {
      const hash = window.location.hash.replace(/^[#?]/, '');
      const hashParams = new URLSearchParams(hash);
      const maxData = hashParams.get('maxWebAppData') || hashParams.get('max_user');
      if (maxData) {
        const innerParams = new URLSearchParams(decodeURIComponent(maxData));
        const userRaw = innerParams.get('user');
        if (userRaw) {
          return JSON.parse(decodeURIComponent(userRaw)) as MaxUser;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Trigger subtle haptic feedback inside MAX
 */
export function triggerMaxHaptic(
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) {
  const max = getMaxWebApp();
  if (!max?.HapticFeedback) return;

  try {
    if (style === 'success' || style === 'warning' || style === 'error') {
      max.HapticFeedback.notificationOccurred(style);
    } else {
      max.HapticFeedback.impactOccurred(style);
    }
  } catch {
    // ignore
  }
}
