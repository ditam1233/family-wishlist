import { describe, it, expect } from 'vitest';
import { normalizeUrl, cleanTitle, getWbBasket } from '../scraper';

describe('Scraper & URL helpers', () => {
  describe('normalizeUrl', () => {
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
