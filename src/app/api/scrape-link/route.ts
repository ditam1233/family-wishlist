import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: 'URL не указан' }, { status: 400 });
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Не удалось загрузить страницу (код: ${response.status})` },
        { status: 422 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Поиск названия
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('meta[name="title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      '';

    // Очистка названия от суффиксов магазинов (например, "Купить наушники - интернет-магазин Ozon")
    title = title.replace(/\s*\|\s*.*$/, '').replace(/\s*—\s*.*$/, '').trim();

    // 2. Поиск картинки
    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    if (image && !/^https?:\/\//i.test(image)) {
      try {
        const parsedBase = new URL(url);
        image = new URL(image, parsedBase.origin).toString();
      } catch {
        // ignore
      }
    }

    // 3. Поиск цены
    const priceStr =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('meta[itemprop="price"]').attr('content') ||
      '';

    let price: number | undefined;
    if (priceStr) {
      const cleanPrice = parseFloat(priceStr.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanPrice)) {
        price = cleanPrice;
      }
    }

    // 4. Поиск описания
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    // 5. Определение названия сайта
    let siteName =
      $('meta[property="og:site_name"]').attr('content') || '';
    if (!siteName) {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        siteName = hostname;
      } catch {
        siteName = '';
      }
    }

    return NextResponse.json({
      title,
      image,
      price,
      description: description.slice(0, 300),
      siteName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ошибка парсинга';
    return NextResponse.json(
      { error: `Не удалось распарсить ссылку: ${message}` },
      { status: 500 }
    );
  }
}
