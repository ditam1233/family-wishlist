import { describe, it, expect } from 'vitest';
import { normalizeInviteCode, simpleHash, isUUID } from '../utils/inviteCode';

describe('Invite codes & Hashing utility', () => {
  describe('normalizeInviteCode', () => {
    it('normalizes spaces and lower case into clean uppercase with hyphen', () => {
      expect(normalizeInviteCode('сем 1234')).toBe('СЕМ-1234');
      expect(normalizeInviteCode('  сем-1234  ')).toBe('СЕМ-1234');
    });

    it('inserts hyphen if 4+ characters provided without hyphen', () => {
      expect(normalizeInviteCode('СЕМ1234')).toBe('СЕМ-1234');
    });

    it('maps Latin lookalike letters to Cyrillic in prefixes', () => {
      // 'C' is Latin, 'E' is Latin, 'M' is Latin
      expect(normalizeInviteCode('CEM-9999')).toBe('СЕМ-9999');
    });
  });

  describe('simpleHash', () => {
    it('produces deterministic output for same input', () => {
      const hash1 = simpleHash('group-123_бабушка');
      const hash2 = simpleHash('group-123_бабушка');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(3);
    });

    it('produces different hashes for different family members', () => {
      const hashA = simpleHash('group-123_мама');
      const hashB = simpleHash('group-123_папа');
      expect(hashA).not.toBe(hashB);
    });
  });

  describe('isUUID', () => {
    it('validates standard UUIDs accurately', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('invalid-uuid')).toBe(false);
      expect(isUUID(undefined)).toBe(false);
    });
  });
});
