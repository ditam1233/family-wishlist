/**
 * MAX Messenger WebApp Bridge Utilities
 * Compatible with MAX Bridge (max-web-app.js / window.WebApp / window.WebViewHandler)
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
  ready?: () => void;
  enableVerticalSwipes?: () => void;
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
    WebViewHandler?: {
      postEvent: (event: string, data: string) => void;
    };
  }
}

/**
 * Returns the MAX WebApp instance if running inside MAX
 */
export function getMaxWebApp(): MaxWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.WebApp || window.maxClient || null;
}

/**
 * Send WebAppReady to MAX native container to dismiss the native loading overlay
 */
export function signalMaxReady() {
  if (typeof window === 'undefined') return;

  // 1. Native mobile bridge (iOS / Android WebView)
  try {
    if (window.WebViewHandler && typeof window.WebViewHandler.postEvent === 'function') {
      window.WebViewHandler.postEvent('WebAppReady', '{}');
    }
  } catch {
    // ignore
  }

  // 2. Iframe bridge (desktop web web.max.ru)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(JSON.stringify({ type: 'WebAppReady' }), '*');
    }
  } catch {
    // ignore
  }

  // 3. High level SDK ready method
  try {
    const max = getMaxWebApp();
    if (max && typeof max.ready === 'function') {
      max.ready();
    }
    if (max && typeof max.enableVerticalSwipes === 'function') {
      max.enableVerticalSwipes();
    }
  } catch {
    // ignore
  }
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

  if (window.WebViewHandler) {
    return true;
  }

  try {
    if (sessionStorage.getItem('WebAppData') || sessionStorage.getItem('WebAppPlatform')) {
      return true;
    }
  } catch {
    // ignore
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
      searchParams.has('max_user') ||
      searchParams.has('WebAppData')
    ) {
      return true;
    }

    if (window.location.hash) {
      const hash = window.location.hash.replace(/^[#?]/, '');
      const hashParams = new URLSearchParams(hash);
      if (
        hashParams.has('WebAppData') ||
        hashParams.has('WebAppPlatform') ||
        hashParams.get('platform') === 'max' ||
        hashParams.has('max_user_id')
      ) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Helper to parse user object from encoded WebAppData string
 */
function parseUserFromInitDataString(rawInitData: string): MaxUser | null {
  try {
    const params = new URLSearchParams(decodeURIComponent(rawInitData));
    const userJson = params.get('user');
    if (userJson) {
      return JSON.parse(decodeURIComponent(userJson)) as MaxUser;
    }
  } catch {
    try {
      const params = new URLSearchParams(rawInitData);
      const userJson = params.get('user');
      if (userJson) {
        return JSON.parse(userJson) as MaxUser;
      }
    } catch {
      // ignore
    }
  }
  return null;
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

  // 2. Parse from window.WebApp.initData
  if (max?.initData) {
    const parsed = parseUserFromInitDataString(max.initData);
    if (parsed && parsed.id) return parsed;
  }

  // 3. Check sessionStorage ('WebAppData')
  try {
    const storedData = sessionStorage.getItem('WebAppData');
    if (storedData) {
      const parsed = parseUserFromInitDataString(storedData);
      if (parsed && parsed.id) return parsed;
    }
  } catch {
    // ignore
  }

  // 4. Check URL hash parameters: location.hash (#WebAppData=...)
  if (window.location.hash) {
    try {
      const hash = window.location.hash.replace(/^[#?]/, '');
      const hashParams = new URLSearchParams(hash);
      const webAppData =
        hashParams.get('WebAppData') ||
        hashParams.get('maxWebAppData') ||
        hashParams.get('initData');
      if (webAppData) {
        const parsed = parseUserFromInitDataString(webAppData);
        if (parsed && parsed.id) return parsed;
      }

      const directUser = hashParams.get('user') || hashParams.get('max_user');
      if (directUser) {
        return JSON.parse(decodeURIComponent(directUser)) as MaxUser;
      }
    } catch {
      // ignore
    }
  }

  // 5. Check URL query parameters (?WebAppData=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const webAppData = searchParams.get('WebAppData');
    if (webAppData) {
      const parsed = parseUserFromInitDataString(webAppData);
      if (parsed && parsed.id) return parsed;
    }

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

    const rawUserJson = searchParams.get('max_user') || searchParams.get('user');
    if (rawUserJson) {
      return JSON.parse(decodeURIComponent(rawUserJson)) as MaxUser;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Dynamically inject MAX SDK only when running inside MAX (non-blocking)
 */
export function loadMaxScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  signalMaxReady();
  if (!isMaxWebApp()) return Promise.resolve();

  if (document.querySelector('script[src*="max-web-app.js"]')) {
    signalMaxReady();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (!finished) {
        finished = true;
        signalMaxReady();
        resolve();
      }
    };
    const timer = setTimeout(done, 1200);

    try {
      const script = document.createElement('script');
      script.src = 'https://st.max.ru/js/max-web-app.js';
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        done();
      };
      script.onerror = () => {
        clearTimeout(timer);
        done();
      };
      document.head.appendChild(script);
    } catch {
      clearTimeout(timer);
      done();
    }
  });
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
