import { User, FamilyGroup } from '@/types';

export const STORAGE_USERS = 'fw_users';
export const STORAGE_GROUPS = 'fw_groups';
export const STORAGE_MEMBERSHIPS = 'fw_memberships';
export const STORAGE_WISHES = 'fw_wishes';
export const STORAGE_RESERVATIONS = 'fw_reservations';
export const STORAGE_SESSION = 'fw_session_user_id';
export const CACHE_USER = 'fw_cached_user';
export const CACHE_GROUPS = 'fw_cached_groups';
export const CACHE_MEMBERS = 'fw_cached_members';

export class LocalStorageAdapter {
  private isClient = typeof window !== 'undefined';

  public get<T>(key: string, defaultValue: T): T {
    if (!this.isClient) return defaultValue;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  public set<T>(key: string, value: T): void {
    if (!this.isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota or private mode
    }
  }

  public remove(key: string): void {
    if (!this.isClient) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // Fast-path cache helpers (0ms hydration)
  public getCachedUser(): User | null {
    return this.get<User | null>(CACHE_USER, null);
  }

  public setCachedUser(user: User | null): void {
    if (user) this.set(CACHE_USER, user);
    else this.remove(CACHE_USER);
  }

  public getCachedGroups(): FamilyGroup[] {
    return this.get<FamilyGroup[]>(CACHE_GROUPS, []);
  }

  public setCachedGroups(groups: FamilyGroup[]): void {
    this.set(CACHE_GROUPS, groups);
  }

  public getCachedMembers(groupId?: string): User[] {
    if (groupId) {
      return this.get<User[]>(`${CACHE_MEMBERS}_${groupId}`, []);
    }
    return [];
  }

  public setCachedMembers(members: User[], groupId?: string): void {
    if (groupId) {
      this.set(`${CACHE_MEMBERS}_${groupId}`, members);
    }
  }

  public purgeLegacyMixedMembers(): void {
    this.remove(CACHE_MEMBERS);
  }
}

export const localStore = new LocalStorageAdapter();
