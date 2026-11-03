import { User, FamilyGroup, Wish, Reservation } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_USERS = 'fw_users';
const STORAGE_GROUPS = 'fw_groups';
const STORAGE_MEMBERSHIPS = 'fw_memberships';
const STORAGE_WISHES = 'fw_wishes';
const STORAGE_RESERVATIONS = 'fw_reservations';
const STORAGE_SESSION = 'fw_session_user_id';

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

  // --- Auth / Users ---

  public async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            birthday: profile.birthday,
            created_at: profile.created_at,
          };
        }

        return {
          id: user.id,
          name: (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Пользователь',
          email: user.email || '',
          created_at: user.created_at,
        };
      } catch (err) {
        console.error('Error fetching Supabase user:', err);
      }
    }

    // Local fallback
    if (!this.isClient) return null;
    const userId = localStorage.getItem(STORAGE_SESSION);
    if (!userId) return null;
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    return users.find((u) => u.id === userId) || null;
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
          // Убеждаемся, что запись в profiles есть
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
    if (this.isClient) {
      localStorage.removeItem(STORAGE_SESSION);
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
        if (groupIds.length === 0) return [];

        const { data: groups } = await supabase
          .from('family_groups')
          .select('*')
          .in('id', groupIds);

        return groups || [];
      } catch (err) {
        console.error('Error fetching groups from Supabase:', err);
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

  public async createGroup(name: string, creatorId: string): Promise<FamilyGroup | null> {
    const cleanName = name.trim();
    const code = cleanName.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: group, error: groupErr } = await supabase
          .from('family_groups')
          .insert({
            name: cleanName,
            invite_code: code,
            created_by: creatorId,
          })
          .select()
          .single();

        if (groupErr || !group) {
          console.error('Group insert error:', groupErr);
          return null;
        }

        await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: creatorId,
        });

        return group;
      } catch (err) {
        console.error('Error creating group in Supabase:', err);
        return null;
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

    return newGroup;
  }

  public async joinGroup(
    inviteCode: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; group?: FamilyGroup }> {
    const code = inviteCode.trim().toUpperCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: group, error } = await supabase
          .from('family_groups')
          .select('*')
          .eq('invite_code', code)
          .maybeSingle();

        if (error || !group) {
          return { success: false, error: 'Семья с таким кодом не найдена' };
        }

        const { error: joinErr } = await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: userId,
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

  public async getFamilyMembers(userId: string): Promise<User[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        // Находим группы пользователя
        const { data: myMemberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        const groupIds = (myMemberships || []).map((m) => m.group_id);
        if (groupIds.length === 0) {
          // Если пока нет групп, возвращаем только самого пользователя
          const { data: me } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          return me ? [me] : [];
        }

        // Находим всех пользователей в этих группах
        const { data: allGroupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds);

        const userIds = Array.from(new Set((allGroupMembers || []).map((m) => m.user_id)));
        userIds.push(userId);

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
    const userGroups = (await this.getUserGroups(userId)).map((g) => g.id);
    const memberships = this.getLocal<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = this.getLocal<User[]>(STORAGE_USERS, []);
    const relatedUserIds = new Set<string>([userId]);

    memberships.forEach((m) => {
      if (userGroups.includes(m.group_id)) relatedUserIds.add(m.user_id);
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
          // АНТИ-СПОЙЛЕР: именинник никогда не видит бронь
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
        const { data: existing } = await supabase
          .from('reservations')
          .select('*')
          .eq('wish_id', wishId)
          .maybeSingle();

        if (existing) {
          if (existing.reserved_by === viewerId) {
            await supabase.from('reservations').delete().eq('wish_id', wishId);
            return true;
          }
          return false;
        }

        await supabase.from('reservations').insert({
          wish_id: wishId,
          reserved_by: viewerId,
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
        const { data, error } = await supabase
          .from('wishes')
          .insert(wishData)
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
        const { error } = await supabase
          .from('wishes')
          .delete()
          .eq('id', wishId)
          .eq('user_id', userId);
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
