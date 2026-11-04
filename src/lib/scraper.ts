export interface ScrapedLinkData {
  title?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  siteName?: string;
}

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

export function getWbBasket(vol: number): string {
  if (vol >= 0 && vol <= 143) return '01';
  if (vol <= 287) return '02';
  if (vol <= 431) return '03';
  if (vol <= 719) return '04';
  if (vol <= 1007) return '05';
  if (vol <= 1061) return '06';
  if (vol <= 1115) return '07';
  if (vol <= 1169) return '08';
  if (vol <= 1313) return '09';
  if (vol <= 1601) return '10';
  if (vol <= 1655) return '11';
  if (vol <= 1919) return '12';
  if (vol <= 2045) return '13';
  if (vol <= 2189) return '14';
  if (vol <= 2405) return '15';
  if (vol <= 2621) return '16';
  if (vol <= 2837) return '17';
  return '18';
}

export async function scrapeLink(rawUrl: string): Promise<ScrapedLinkData> {
  const url = normalizeUrl(rawUrl);
  if (!url || !url.startsWith('http')) {
    return {};
  }

  // 1. Wildberries: Direct CDN photo + ID detection
  const wbMatch = url.match(/\/catalog\/(\d{6,12})\//i) || url.match(/nm=(\d{6,12})/i);
  if (wbMatch) {
    const wbId = parseInt(wbMatch[1], 10);
    const vol = Math.floor(wbId / 100000);
    const part = Math.floor(wbId / 1000);
    const basket = getWbBasket(vol);
    const wbImage = 'https://basket-' + basket + '.wbbasket.ru/vol' + vol + '/part' + part + '/' + wbId + '/images/big/1.webp';

    const wbSlugMatch = url.match(/\/detail\/([^?#]+)/i);
    let wbTitle = 'Товар Wildberries #' + wbId;
    if (wbSlugMatch && wbSlugMatch[1] && wbSlugMatch[1] !== 'detail.aspx') {
      try {
        wbTitle = decodeURIComponent(wbSlugMatch[1]).replace(/[-_]+/g, ' ').trim();
      } catch {
        /* ignore */
      }
    }

    return {
      title: cleanTitle(wbTitle),
      image: wbImage,
      siteName: 'Wildberries',
      currency: '₽',
    };
  }

  // 2. Ozon: Fast slug extractor
  const ozonMatch = url.match(/\/product\/([a-zA-Z0-9-_%]+?)(?:-(\d{6,}))?(?:\/|\?|$)/i);
  let ozonInitialTitle: string | undefined;
  if (ozonMatch && ozonMatch[1]) {
    try {
      const decodedSlug = decodeURIComponent(ozonMatch[1]).replace(/[-_]+/g, ' ').trim();
      if (decodedSlug.length > 3) {
        ozonInitialTitle = decodedSlug.charAt(0).toUpperCase() + decodedSlug.slice(1);
      }
    } catch {
      /* ignore */
    }
  }

  // Tier 1: Try local API endpoint (if running Next.js dev or Node server)
  try {
    const localController = new AbortController();
    const localTimeout = setTimeout(() => localController.abort(), 2000);

    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/family-wishlist')
      ? '/family-wishlist'
      : '';

    const localRes = await fetch(basePath + '/api/scrape-link', {
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
          title: cleanTitle(data.title) || ozonInitialTitle,
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

  // Tier 2: Microlink API (free public metadata extraction service)
  try {
    const microController = new AbortController();
    const microTimeout = setTimeout(() => microController.abort(), 4500);

    const microRes = await fetch(
      'https://api.microlink.io?url=' + encodeURIComponent(url) + '&palette=false',
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

        if (d.price) {
          const p = parseFloat(String(d.price).replace(/[^\d.]/g, ''));
          if (!isNaN(p)) priceNum = p;
        }

        const title = cleanTitle(d.title || '') || ozonInitialTitle;
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

  // Tier 3: Client CORS Proxy (allorigins & corsproxy)
  const proxies = [
    (target: string) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
    (target: string) => 'https://corsproxy.io/?url=' + encodeURIComponent(target),
  ];

  for (const proxyFn of proxies) {
    try {
      const proxyController = new AbortController();
      const proxyTimeout = setTimeout(() => proxyController.abort(), 3500);

      const proxyRes = await fetch(proxyFn(url), {
        signal: proxyController.signal,
      });
      clearTimeout(proxyTimeout);

      if (proxyRes.ok) {
        const htmlText = await proxyRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const rawTitle =
          doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          doc.querySelector('h1')?.textContent ||
          doc.querySelector('title')?.textContent ||
          '';

        const title = cleanTitle(rawTitle) || ozonInitialTitle;

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

        const description =
          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
          undefined;

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

        if (title || image) {
          return {
            title,
            description,
            image: image || undefined,
            price,
            currency: '₽',
          };
        }
      }
    } catch {
      // try next proxy
    }
  }

  // Fallback: derive title from hostname or ozon initial title
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    return {
      title: ozonInitialTitle || ('Товар из ' + domain),
      currency: '₽',
    };
  } catch {
    return {
      title: ozonInitialTitle,
      currency: '₽',
    };
  }
}
