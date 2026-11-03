import { User, FamilyGroup, Wish, Reservation } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_USERS = 'fw_users';
const STORAGE_GROUPS = 'fw_groups';
const STORAGE_MEMBERSHIPS = 'fw_memberships';
const STORAGE_WISHES = 'fw_wishes';
const STORAGE_RESERVATIONS = 'fw_reservations';
const STORAGE_SESSION = 'fw_session_user_id';

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
  if (/[А-ЯЁ]/.test(prefix)) {
    parts[0] = prefix
      .split('')
      .map((ch) => LATIN_TO_CYRILLIC[ch] || ch)
      .join('');
  }
  return parts.join('-');
}

class WishlistDataStore {
  private isClient = typeof window !== 'undefined';

  private getLocal<T>(key: string, defaultValue: T): T {
    if (!this.isClient) return defaultValue;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    if (!this.isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota
    }
  }

  // --- Cache helpers for instant 0ms restoration ---
  public getCachedUser(): User | null {
    return this.getLocal<User | null>('fw_cached_user', null);
  }

  public setCachedUser(user: User | null): void {
    if (user) this.setLocal('fw_cached_user', user);
    else if (this.isClient) localStorage.removeItem('fw_cached_user');
  }

  public getCachedGroups(): FamilyGroup[] {
    return this.getLocal<FamilyGroup[]>('fw_cached_groups', []);
  }

  public setCachedGroups(groups: FamilyGroup[]): void {
    this.setLocal('fw_cached_groups', groups);
  }

  public getCachedMembers(): User[] {
    return this.getLocal<User[]>('fw_cached_members', []);
  }

  public setCachedMembers(members: User[]): void {
    this.setLocal('fw_cached_members', members);
  }

  // --- Auth / Users ---

  public async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        // Fast path: getSession() reads session token synchronously from local storage
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          this.setCachedUser(null);
          return null;
        }

        const authUser = sessionData.session.user;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        const userObj: User = profile
          ? {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              birthday: profile.birthday,
              created_at: profile.created_at,
            }
          : {
              id: authUser.id,
              name: (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || 'Пользователь',
              email: authUser.email || '',
              created_at: authUser.created_at,
            };

        this.setCachedUser(userObj);
        return userObj;
      } catch (err) {
        console.error('Error fetching Supabase user:', err);
        return this.getCachedUser();
      }
    }

    // Local fallback
    if (!this.isClient) return null;
    const userId = localStorage.getItem(STORAGE_SESSION);
    if (!userId) return null;
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    return users.find((u) => u.id === userId) || null;
  }

  /**
   * Быстрый вход для родственников: только Код приглашения + Имя
   */
  public async joinByCode(
    inviteCode: string,
    name: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanCode = normalizeInviteCode(inviteCode);
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      return { success: false, error: 'Укажите код семьи и ваше имя' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Проверяем существование группы (регистронезависимо через ilike)
        const { data: group, error: grpErr } = await supabase
          .from('family_groups')
          .select('*')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        if (grpErr || !group) {
          return { success: false, error: 'Семья с таким кодом не найдена. Проверьте код.' };
        }

        // 2. Создаем аккаунт родственника под капотом без паролей
        const safeCode = cleanCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'fam';
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const generatedEmail = `${safeCode}_${randomSuffix}@family.local`;
        const generatedPassword = `pwd_${safeCode}_${Date.now()}`;

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: generatedEmail,
          password: generatedPassword,
          options: {
            data: { name: cleanName },
          },
        });

        if (authErr || !authData.user) {
          return { success: false, error: authErr?.message || 'Ошибка создания профиля' };
        }

        const newUserId = authData.user.id;

        // 3. Создаем запись в profiles
        await supabase.from('profiles').upsert({
          id: newUserId,
          name: cleanName,
          email: generatedEmail,
        });

        // 4. Присоединяем к группе
        await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: newUserId,
        });

        const userObj: User = {
          id: newUserId,
          name: cleanName,
          email: generatedEmail,
          created_at: authData.user.created_at,
        };

        return { success: true, user: userObj };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка при входе в семью';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const groups = this.getLocal<FamilyGroup[]>(STORAGE_GROUPS, []);
    const group = groups.find((g) => g.invite_code === cleanCode);
    if (!group) {
      return { success: false, error: 'Семья с таким кодом не найдена' };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: `${cleanName.toLowerCase()}@local.family`,
      created_at: new Date().toISOString(),
    };

    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    users.push(newUser);
    this.setLocal(STORAGE_USERS, users);

    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    memberships.push({ group_id: group.id, user_id: newUser.id });
    this.setLocal(STORAGE_MEMBERSHIPS, memberships);

    if (this.isClient) localStorage.setItem(STORAGE_SESSION, newUser.id);
    return { success: true, user: newUser };
  }

  public async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanEmail || !password) {
      return { success: false, error: 'Заполните все поля' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: cleanName },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
          });

          const userObj: User = {
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            created_at: data.user.created_at,
          };
          return { success: true, user: userObj };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка регистрации в Supabase';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    if (users.some((u) => u.email === cleanEmail)) {
      return { success: false, error: 'Пользователь с таким email уже существует' };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: password,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.setLocal(STORAGE_USERS, users);
    if (this.isClient) localStorage.setItem(STORAGE_SESSION, newUser.id);

    return { success: true, user: newUser };
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          return { success: false, error: 'Неверный email или пароль' };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const userObj: User = {
            id: data.user.id,
            name: profile?.name || (data.user.user_metadata?.name as string) || cleanEmail.split('@')[0],
            email: cleanEmail,
            created_at: data.user.created_at,
          };
          return { success: true, user: userObj };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка входа в Supabase';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    const user = users.find((u) => u.email === cleanEmail && u.password === password);
    if (!user) {
      return { success: false, error: 'Неверный email или пароль' };
    }
    if (this.isClient) localStorage.setItem(STORAGE_SESSION, user.id);
    return { success: true, user };
  }

  public async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    this.setCachedUser(null);
    if (this.isClient) {
      localStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem('fw_cached_groups');
      localStorage.removeItem('fw_cached_members');
    }
  }

  // --- Family Groups ---

  public async getUserGroups(userId: string): Promise<FamilyGroup[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        const groupIds = (memberships || []).map((m) => m.group_id);
        if (groupIds.length === 0) {
          this.setCachedGroups([]);
          return [];
        }

        const { data: groups } = await supabase
          .from('family_groups')
          .select('*')
          .in('id', groupIds);

        const list = groups || [];
        this.setCachedGroups(list);
        return list;
      } catch (err) {
        console.error('Error fetching groups from Supabase:', err);
        return this.getCachedGroups();
      }
    }

    // Local fallback
    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    ).filter((m) => m.user_id === userId);
    const groups = this.getLocal<FamilyGroup[]>(STORAGE_GROUPS, []);
    return groups.filter((g) => memberships.some((m) => m.group_id === g.id));
  }

  public async createGroup(
    name: string,
    creatorId: string
  ): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
    const cleanName = name.trim();
    const code = cleanName.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || creatorId;

        const { data: group, error: groupErr } = await supabase
          .from('family_groups')
          .insert({
            name: cleanName,
            invite_code: code,
            created_by: activeUserId,
          })
          .select()
          .single();

        if (groupErr || !group) {
          console.error('Group insert error:', groupErr);
          return { success: false, error: groupErr?.message || 'Ошибка создания группы в базе' };
        }

        await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: activeUserId,
        });

        return { success: true, group };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка создания группы';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const groups = this.getLocal<FamilyGroup[]>(STORAGE_GROUPS, []);
    const newGroup: FamilyGroup = {
      id: `group-${Date.now()}`,
      name: cleanName,
      invite_code: code,
      created_by: creatorId,
      created_at: new Date().toISOString(),
    };
    groups.push(newGroup);
    this.setLocal(STORAGE_GROUPS, groups);

    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    memberships.push({ group_id: newGroup.id, user_id: creatorId });
    this.setLocal(STORAGE_MEMBERSHIPS, memberships);

    return { success: true, group: newGroup };
  }

  public async joinGroup(
    inviteCode: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; group?: FamilyGroup }> {
    const code = normalizeInviteCode(inviteCode);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || userId;

        const { data: group, error } = await supabase
          .from('family_groups')
          .select('*')
          .ilike('invite_code', code)
          .maybeSingle();

        if (error || !group) {
          return { success: false, error: 'Семья с таким кодом не найдена' };
        }

        const { error: joinErr } = await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: activeUserId,
        });

        if (joinErr) {
          return { success: false, error: 'Вы уже состоите в этой семье' };
        }

        return { success: true, group };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка присоединения';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const groups = this.getLocal<FamilyGroup[]>(STORAGE_GROUPS, []);
    const group = groups.find((g) => g.invite_code === code);
    if (!group) return { success: false, error: 'Группа не найдена' };

    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    if (memberships.some((m) => m.group_id === group.id && m.user_id === userId)) {
      return { success: false, error: 'Вы уже состоите в этой группе' };
    }
    memberships.push({ group_id: group.id, user_id: userId });
    this.setLocal(STORAGE_MEMBERSHIPS, memberships);

    return { success: true, group };
  }

  public async getFamilyMembers(userId: string, groupId?: string): Promise<User[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let groupIds: string[] = [];
        if (groupId && groupId !== 'all') {
          groupIds = [groupId];
        } else {
          const { data: myMemberships } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId);
          groupIds = (myMemberships || []).map((m) => m.group_id);
        }

        if (groupIds.length === 0) {
          const { data: me } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          return me ? [me] : [];
        }

        const { data: allGroupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds);

        const userIds = Array.from(new Set((allGroupMembers || []).map((m) => m.user_id)));
        if (!userIds.includes(userId)) {
          userIds.push(userId);
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        return profiles || [];
      } catch (err) {
        console.error('Error fetching family members from Supabase:', err);
      }
    }

    // Local fallback
    const targetGroupIds = groupId && groupId !== 'all'
      ? [groupId]
      : (await this.getUserGroups(userId)).map((g) => g.id);

    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    const relatedUserIds = new Set<string>([userId]);

    memberships.forEach((m) => {
      if (targetGroupIds.includes(m.group_id)) relatedUserIds.add(m.user_id);
    });

    return users.filter((u) => relatedUserIds.has(u.id));
  }

  // --- Wishes & Anti-Spoiler ---

  public async getWishesForUser(targetUserId: string, viewerId: string) {
    const isOwner = targetUserId === viewerId;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: wishes } = await supabase
          .from('wishes')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!wishes) return [];

        if (isOwner) {
          return wishes.map((w) => ({
            ...w,
            is_reserved: false,
            reserved_by_me: false,
          }));
        }

        const wishIds = wishes.map((w) => w.id);
        const { data: reservations } = await supabase
          .from('reservations')
          .select('*')
          .in('wish_id', wishIds);

        return wishes.map((w) => {
          const res = (reservations || []).find((r) => r.wish_id === w.id);
          return {
            ...w,
            is_reserved: Boolean(res),
            reserved_by_me: res?.reserved_by === viewerId,
          };
        });
      } catch (err) {
        console.error('Error fetching wishes from Supabase:', err);
      }
    }

    // Local fallback
    const wishes = this.getLocal<Wish[]>(STORAGE_WISHES, []).filter(
      (w) => w.user_id === targetUserId
    );
    const reservations = this.getLocal<Reservation[]>(STORAGE_RESERVATIONS, []);

    return wishes.map((wish) => {
      const reservation = reservations.find((r) => r.wish_id === wish.id);
      if (isOwner) {
        return { ...wish, is_reserved: false, reserved_by_me: false };
      }
      return {
        ...wish,
        is_reserved: Boolean(reservation),
        reserved_by_me: reservation?.reserved_by === viewerId,
      };
    });
  }

  public async toggleReservation(wishId: string, viewerId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || viewerId;

        const { data: existing } = await supabase
          .from('reservations')
          .select('*')
          .eq('wish_id', wishId)
          .maybeSingle();

        if (existing) {
          if (existing.reserved_by === activeUserId) {
            await supabase.from('reservations').delete().eq('wish_id', wishId);
            return true;
          }
          return false;
        }

        await supabase.from('reservations').insert({
          wish_id: wishId,
          reserved_by: activeUserId,
        });
        return true;
      } catch (err) {
        console.error('Error toggling reservation in Supabase:', err);
        return false;
      }
    }

    // Local fallback
    const reservations = this.getLocal<Reservation[]>(STORAGE_RESERVATIONS, []);
    const idx = reservations.findIndex((r) => r.wish_id === wishId);
    if (idx >= 0) {
      if (reservations[idx].reserved_by === viewerId) {
        reservations.splice(idx, 1);
        this.setLocal(STORAGE_RESERVATIONS, reservations);
        return true;
      }
      return false;
    }
    reservations.push({
      id: `res-${Date.now()}`,
      wish_id: wishId,
      reserved_by: viewerId,
      created_at: new Date().toISOString(),
    });
    this.setLocal(STORAGE_RESERVATIONS, reservations);
    return true;
  }

  public async addWish(wishData: Omit<Wish, 'id' | 'created_at'>): Promise<Wish | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || wishData.user_id;

        const { data, error } = await supabase
          .from('wishes')
          .insert({
            ...wishData,
            user_id: activeUserId,
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting wish into Supabase:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Error adding wish in Supabase:', err);
        return null;
      }
    }

    // Local fallback
    const wishes = this.getLocal<Wish[]>(STORAGE_WISHES, []);
    const newWish: Wish = {
      ...wishData,
      id: `wish-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    wishes.unshift(newWish);
    this.setLocal(STORAGE_WISHES, wishes);
    return newWish;
  }

  public async deleteWish(wishId: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || userId;

        const { error } = await supabase
          .from('wishes')
          .delete()
          .eq('id', wishId)
          .eq('user_id', activeUserId);
        return !error;
      } catch {
        return false;
      }
    }

    // Local fallback
    const wishes = this.getLocal<Wish[]>(STORAGE_WISHES, []);
    const wish = wishes.find((w) => w.id === wishId);
    if (!wish || wish.user_id !== userId) return false;

    this.setLocal(
      STORAGE_WISHES,
      wishes.filter((w) => w.id !== wishId)
    );
    this.setLocal(
      STORAGE_RESERVATIONS,
      this.getLocal<Reservation[]>(STORAGE_RESERVATIONS, []).filter(
        (r) => r.wish_id !== wishId
      )
    );
    return true;
  }
}

export const dataStore = new WishlistDataStore();
