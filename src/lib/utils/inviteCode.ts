export const isUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н',
  K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т',
  X: 'Х', Y: 'У',
};

export function normalizeInviteCode(raw: string): string {
  let code = raw.trim().toUpperCase().replace(/[\u2010-\u2015\u2212\s_]+/g, '-');
  if (!code.includes('-') && code.length >= 4) {
    code = code.slice(0, 3) + '-' + code.slice(3);
  }
  const parts = code.split('-');
  const prefix = parts[0];
  if (/[\u0410-\u042F\u0401]/.test(prefix)) {
    parts[0] = prefix
      .split('')
      .map((ch) => LATIN_TO_CYRILLIC[ch] || ch)
      .join('');
  }
  return parts.join('-');
}

export function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
