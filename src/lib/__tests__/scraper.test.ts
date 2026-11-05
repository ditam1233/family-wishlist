import { describe, it, expect } from 'vitest';
import { normalizeUrl, cleanTitle, getWbBasket, extractUrlAndTitle } from '../scraper';

describe('Scraper & URL helpers', () => {
  describe('extractUrlAndTitle', () => {
    it('extracts URL and title from Ozon mobile share text', () => {
      const input = 'Игровой набор игрушечные продукты, овощи и фрукты на липучках, в корзинке "Кухня" https://ozon.ru/t/l1Pvfzk';
      const result = extractUrlAndTitle(input);
      expect(result.url).toBe('https://ozon.ru/t/l1Pvfzk');
      expect(result.extractedTitle).toBe('Игровой набор игрушечные продукты, овощи и фрукты на липучках, в корзинке "Кухня"');
    });

    it('extracts URL and cleans Wildberries share prefix', () => {
      const input = 'Смотри, что нашлось на Wildberries: Наушники беспроводные https://www.wildberries.ru/catalog/12345/detail.aspx';
      const result = extractUrlAndTitle(input);
      expect(result.url).toBe('https://www.wildberries.ru/catalog/12345/detail.aspx');
      expect(result.extractedTitle).toBe('Наушники беспроводные');
    });

    it('strips trailing punctuation from URL', () => {
      expect(extractUrlAndTitle('Подари мне https://ozon.ru/t/abc.').url).toBe('https://ozon.ru/t/abc');
      expect(extractUrlAndTitle('https://ozon.ru/t/abc,').url).toBe('https://ozon.ru/t/abc');
      expect(extractUrlAndTitle('("https://ozon.ru/t/abc")').url).toBe('https://ozon.ru/t/abc');
    });

    it('handles domain without protocol in text', () => {
      const result = extractUrlAndTitle('Конструктор Лего ozon.ru/product/123');
      expect(result.url).toBe('https://ozon.ru/product/123');
      expect(result.extractedTitle).toBe('Конструктор Лего');
    });

    it('returns empty url for text without links', () => {
      const result = extractUrlAndTitle('Просто обычный подарок');
      expect(result.url).toBe('');
      expect(result.extractedTitle).toBeUndefined();
    });
  });

  describe('normalizeUrl', () => {
    it('extracts clean URL from messy marketplace text', () => {
      const input = 'Игровой набор игрушечные продукты, овощи и фрукты на липучках, в корзинке "Кухня" https://ozon.ru/t/l1Pvfzk';
      expect(normalizeUrl(input)).toBe('https://ozon.ru/t/l1Pvfzk');
    });

    it('adds https:// if protocol is missing from standard domains', () => {
      expect(normalizeUrl('wildberries.ru/catalog/12345/detail.aspx')).toBe(
        'https://wildberries.ru/catalog/12345/detail.aspx'
      );
      expect(normalizeUrl('ozon.ru/product/item-123')).toBe(
        'https://ozon.ru/product/item-123'
      );
    });

    it('preserves existing https:// and http:// protocols', () => {
      expect(normalizeUrl('https://example.com/test')).toBe('https://example.com/test');
      expect(normalizeUrl('http://example.com/test')).toBe('http://example.com/test');
    });

    it('returns empty string for blank input', () => {
      expect(normalizeUrl('   ')).toBe('');
      expect(normalizeUrl(undefined)).toBe('');
    });
  });

  describe('cleanTitle', () => {
    it('removes marketplace noise and marketing slogans', () => {
      expect(
        cleanTitle('Кофеварка рожковая Redmond — купить по выгодной цене в интернет-магазине')
      ).toBe('Кофеварка рожковая Redmond');

      expect(cleanTitle('Наушники беспроводные на Wildberries')).toBe('Наушники беспроводные');
      expect(cleanTitle('Книга Гарри Поттер | OZON')).toBe('Книга Гарри Поттер');
    });

    it('handles empty titles gracefully', () => {
      expect(cleanTitle('')).toBe('');
    });
  });

  describe('getWbBasket', () => {
    it('calculates correct Wildberries CDN basket IDs based on vol volume', () => {
      expect(getWbBasket(50)).toBe('01');
      expect(getWbBasket(143)).toBe('01');
      expect(getWbBasket(144)).toBe('02');
      expect(getWbBasket(287)).toBe('02');
      expect(getWbBasket(350)).toBe('03');
      expect(getWbBasket(700)).toBe('04');
      expect(getWbBasket(1500)).toBe('10');
      expect(getWbBasket(3000)).toBe('18');
    });
  });
});
