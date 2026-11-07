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
  // MAX injects window.WebApp (or window.maxClient)
  return window.WebApp || window.maxClient || null;
}

/**
 * Check if the application is opened inside MAX
 */
export function isMaxWebApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check window.WebApp from MAX bridge
  const max = getMaxWebApp();
  if (max?.initDataUnsafe?.user || max?.platform) {
    return true;
  }

  // 2. Check User-Agent or URL parameters for MAX
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('max') || ua.includes('maxmessenger') || ua.includes('maxapp')) {
    return true;
  }

  // 3. Check query param ?platform=max or ?max_user_id=...
  const params = new URLSearchParams(window.location.search);
  if (params.get('platform') === 'max' || params.has('max_user_id') || params.has('max_user')) {
    return true;
  }

  return false;
}

/**
 * Get current MAX user profile if available
 */
export function getMaxUser(): MaxUser | null {
  if (typeof window === 'undefined') return null;

  const max = getMaxWebApp();
  if (max?.initDataUnsafe?.user) {
    return max.initDataUnsafe.user;
  }

  // Fallback 1: check URL query params ?max_user_id=...
  try {
    const params = new URLSearchParams(window.location.search);
    const maxUserId = params.get('max_user_id');
    if (maxUserId) {
      return {
        id: maxUserId,
        first_name: params.get('max_first_name') || params.get('name') || 'Пользователь MAX',
        last_name: params.get('max_last_name') || undefined,
        username: params.get('max_username') || undefined,
        photo_url: params.get('max_photo_url') || undefined,
      };
    }

    const rawUserJson = params.get('max_user');
    if (rawUserJson) {
      return JSON.parse(decodeURIComponent(rawUserJson)) as MaxUser;
    }
  } catch {
    // ignore
  }

  // Fallback 2: parse initData if present
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
