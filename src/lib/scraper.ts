export interface ScrapedLinkData {
  title?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  siteName?: string;
}

/**
 * Normalizes input URL strings
 */
export function normalizeUrl(raw: string): string {
  let clean = raw.trim();
  if (!clean) return '';
  if (
    /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(clean) &&
    !clean.startsWith('http://') &&
    !clean.startsWith('https://')
  ) {
    clean = 'https://' + clean;
  }
  return clean;
}

/**
 * Cleans store promotional garbage from scraped titles
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\|\s*.*$/g, '')
    .replace(/\s*—\s*интернет-магазин.*$/gi, '')
    .replace(/\s*—\s*купить.*$/gi, '')
    .replace(/\s*купить по выгодной цене.*$/gi, '')
    .replace(/\s*в интернет-магазине.*$/gi, '')
    .replace(/\s*на OZON.*$/gi, '')
    .replace(/\s*на Wildberries.*$/gi, '')
    .replace(/\s*Wildberries.*$/gi, '')
    .replace(/\s*Яндекс Маркет.*$/gi, '')
    .trim();
}

/**
 * Robust multi-tier link scraper that works both in Node.js server
 * and on static hosting like GitHub Pages!
 */
export async function scrapeLink(rawUrl: string): Promise<ScrapedLinkData> {
  const url = normalizeUrl(rawUrl);
  if (!url || !url.startsWith('http')) {
    return {};
  }

  // Tier 1: Try local API endpoint (if running Next.js dev or Node server)
  try {
    const localController = new AbortController();
    const localTimeout = setTimeout(() => localController.abort(), 2500);

    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/family-wishlist')
      ? '/family-wishlist'
      : '';

    const localRes = await fetch(`${basePath}/api/scrape-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: localController.signal,
    });
    clearTimeout(localTimeout);

    if (localRes.ok) {
      const data = await localRes.json();
      if (data && (data.title || data.image || data.price)) {
        return {
          title: cleanTitle(data.title),
          description: data.description,
          image: data.image,
          price: data.price,
          currency: data.currency || '₽',
          siteName: data.siteName,
        };
      }
    }
  } catch {
    // Local API not available (e.g. GitHub Pages static export) - proceed to client tiers!
  }

  // Tier 2: Microlink API (free public metadata extraction service, handles OpenGraph, images, Twitter cards)
  try {
    const microController = new AbortController();
    const microTimeout = setTimeout(() => microController.abort(), 6000);

    const microRes = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}&palette=false`,
      {
        signal: microController.signal,
      }
    );
    clearTimeout(microTimeout);

    if (microRes.ok) {
      const json = await microRes.json();
      if (json.status === 'success' && json.data) {
        const d = json.data;
        let priceNum: number | undefined;

        // Try extracting price if available
        if (d.price) {
          const p = parseFloat(String(d.price).replace(/[^\d.]/g, ''));
          if (!isNaN(p)) priceNum = p;
        }

        const title = cleanTitle(d.title || '');
        const image = d.image?.url || d.logo?.url || undefined;
        const description = d.description || undefined;
        const siteName = d.publisher || undefined;

        if (title || image) {
          return {
            title,
            description,
            image,
            price: priceNum,
            currency: '₽',
            siteName,
          };
        }
      }
    }
  } catch {
    // proceed to Tier 3
  }

  // Tier 3: CORS proxy + client DOMParser fallback
  try {
    const proxyController = new AbortController();
    const proxyTimeout = setTimeout(() => proxyController.abort(), 6000);

    const proxyRes = await fetch(
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      {
        signal: proxyController.signal,
      }
    );
    clearTimeout(proxyTimeout);

    if (proxyRes.ok) {
      const htmlText = await proxyRes.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Title
      const rawTitle =
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        doc.querySelector('h1')?.textContent ||
        doc.querySelector('title')?.textContent ||
        '';

      const title = cleanTitle(rawTitle);

      // Image
      let image =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="og:image:url"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
        doc.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
        '';

      if (image && !/^https?:\/\//i.test(image)) {
        try {
          const parsedBase = new URL(url);
          image = new URL(image, parsedBase.origin).toString();
        } catch {
          /* ignore */
        }
      }

      // Description
      const description =
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
        undefined;

      // Price
      const priceStr =
        doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content') ||
        doc.querySelector('meta[itemprop="price"]')?.getAttribute('content') ||
        '';

      let price: number | undefined;
      if (priceStr) {
        const cleanPrice = parseFloat(priceStr.replace(/[^\d.]/g, ''));
        if (!isNaN(cleanPrice)) price = cleanPrice;
      }

      return {
        title,
        description,
        image: image || undefined,
        price,
        currency: '₽',
      };
    }
  } catch {
    // ignore
  }

  // Fallback: derive title from hostname
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    return {
      title: `Товар из ${domain}`,
      currency: '₽',
    };
  } catch {
    return {
      currency: '₽',
    };
  }
}
