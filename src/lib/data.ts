import { User, FamilyGroup, Wish, Reservation } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { isUUID, normalizeInviteCode, simpleHash } from './utils/inviteCode';
import {
  localStore,
  STORAGE_USERS,
  STORAGE_GROUPS,
  STORAGE_MEMBERSHIPS,
  STORAGE_WISHES,
  STORAGE_RESERVATIONS,
  STORAGE_SESSION,
} from './storage/localStorageAdapter';
import { applyAntiSpoiler, DisplayWish } from './wishes/antiSpoiler';

export { isUUID, normalizeInviteCode, simpleHash };
export type { DisplayWish };

class WishlistDataStore {
  // --- Cache helpers for instant 0ms restoration ---
  public getCachedUser(): User | null {
    return localStore.getCachedUser();
  }

  public setCachedUser(user: User | null): void {
    localStore.setCachedUser(user);
  }

  public getCachedGroups(): FamilyGroup[] {
    return localStore.getCachedGroups();
  }

  public setCachedGroups(groups: FamilyGroup[]): void {
    localStore.setCachedGroups(groups);
  }

  public getCachedMembers(groupId?: string): User[] {
    return localStore.getCachedMembers(groupId);
  }

  public setCachedMembers(members: User[], groupId?: string): void {
    localStore.setCachedMembers(members, groupId);
  }

  public purgeLegacyMixedMembers(): void {
    localStore.purgeLegacyMixedMembers();
  }

  // --- Auth / Users ---

  public async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
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
              avatar_url: profile.avatar_url,
              birthday: profile.birthday,
              telegram_id: profile.telegram_id,
              telegram_username: profile.telegram_username,
              max_user_id: profile.max_user_id,
              created_at: profile.created_at,
            }
          : {
              id: authUser.id,
              name:
                (authUser.user_metadata?.name as string) ||
                authUser.email?.split('@')[0] ||
                'Пользователь',
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

    const userId = localStore.get<string | null>(STORAGE_SESSION, null);
    if (!userId) return null;
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    return users.find((u) => u.id === userId) || null;
  }

  public async getFamilyInfoByCode(
    inviteCode: string
  ): Promise<{ group: FamilyGroup | null; members: User[] }> {
    const cleanCode = normalizeInviteCode(inviteCode);
    if (!cleanCode) return { group: null, members: [] };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: group } = await supabase
          .from('family_groups')
          .select('*')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        if (!group) return { group: null, members: [] };

        const { data: memberRows } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id);

        const userIds = (memberRows || []).map((m) => m.user_id);
        if (userIds.length === 0) return { group, members: [] };

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        return { group, members: profiles || [] };
      } catch (err) {
        console.error('Error fetching family info by code:', err);
        return { group: null, members: [] };
      }
    }

    const groups = localStore.get<FamilyGroup[]>(STORAGE_GROUPS, []);
    const group = groups.find((g) => g.invite_code === cleanCode) || null;
    if (!group) return { group: null, members: [] };

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const memberIds = memberships
      .filter((m) => m.group_id === group.id)
      .map((m) => m.user_id);
    const members = users.filter((u) => memberIds.includes(u.id));

    return { group, members };
  }

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
        const { data: group, error: grpErr } = await supabase
          .from('family_groups')
          .select('*')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        if (grpErr || !group) {
          return { success: false, error: 'Семья с таким кодом не найдена. Проверьте код.' };
        }

        const hash = simpleHash(`${group.id}_${cleanName.toLowerCase()}`);
        const deterministicEmail = `rel_${hash}@family.local`;
        const deterministicPassword = `pwd_rel_${hash}_wishlist2026`;

        let userId = '';
        let userCreatedAt = new Date().toISOString();

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: deterministicEmail,
          password: deterministicPassword,
        });

        if (!signInErr && signInData.user) {
          userId = signInData.user.id;
          userCreatedAt = signInData.user.created_at;
        } else {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: deterministicEmail,
            password: deterministicPassword,
            options: {
              data: { name: cleanName },
            },
          });

          if (signUpErr || !signUpData.user) {
            return { success: false, error: signUpErr?.message || 'Ошибка входа' };
          }
          userId = signUpData.user.id;
          userCreatedAt = signUpData.user.created_at;
        }

        const { data: existingMember } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingMember) {
          await supabase.from('group_members').insert({
            group_id: group.id,
            user_id: userId,
          });
        }

        const userObj: User = {
          id: userId,
          name: cleanName,
          email: deterministicEmail,
          created_at: userCreatedAt,
        };

        this.setCachedUser(userObj);
        return { success: true, user: userObj };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка при входе в семью';
        return { success: false, error: msg };
      }
    }

    const groups = localStore.get<FamilyGroup[]>(STORAGE_GROUPS, []);
    const group = groups.find((g) => g.invite_code === cleanCode);
    if (!group) {
      return { success: false, error: 'Семья с таким кодом не найдена' };
    }

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = localStore.get<User[]>(STORAGE_USERS, []);

    const memberIds = memberships
      .filter((m) => m.group_id === group.id)
      .map((m) => m.user_id);
    const existingUser = users.find(
      (u) => memberIds.includes(u.id) && u.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingUser) {
      localStore.set(STORAGE_SESSION, existingUser.id);
      this.setCachedUser(existingUser);
      return { success: true, user: existingUser };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: `${cleanName.toLowerCase()}@family.local`,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    localStore.set(STORAGE_USERS, users);
    memberships.push({ group_id: group.id, user_id: newUser.id });
    localStore.set(STORAGE_MEMBERSHIPS, memberships);
    localStore.set(STORAGE_SESSION, newUser.id);
    this.setCachedUser(newUser);

    return { success: true, user: newUser };
  }

  /**
   * Find an existing user bound to a MAX Messenger user ID
   */
  public async findUserByMaxId(
    maxUserId: number | string
  ): Promise<User | null> {
    const midStr = String(maxUserId);
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('max_user_id', midStr)
          .maybeSingle();

        if (profile) {
          const userObj: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            birthday: profile.birthday,
            telegram_id: profile.telegram_id,
            telegram_username: profile.telegram_username,
            max_user_id: profile.max_user_id,
            created_at: profile.created_at,
          };
          this.setCachedUser(userObj);
          return userObj;
        }
      } catch (err) {
        console.error('Error finding user by max_user_id in Supabase:', err);
      }
    }

    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const localUser = users.find((u) => String(u.max_user_id) === midStr);
    if (localUser) {
      localStore.set(STORAGE_SESSION, localUser.id);
      this.setCachedUser(localUser);
      return localUser;
    }
    return null;
  }

  /**
   * Link an existing family member to a MAX account
   */
  public async linkMaxToUser(
    targetUserId: string,
    maxUser: { id: number | string; first_name: string; last_name?: string; username?: string; photo_url?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const midStr = String(maxUser.id);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingOther } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('max_user_id', midStr)
          .maybeSingle();

        if (existingOther && existingOther.id !== targetUserId) {
          return {
            success: false,
            error: `Этот аккаунт MAX уже привязан к «${existingOther.name}»`,
          };
        }

        const updatePayload: Record<string, unknown> = {
          max_user_id: midStr,
        };
        if (maxUser.photo_url) {
          updatePayload.avatar_url = maxUser.photo_url;
        }

        const { data: updatedProfile, error: updateErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', targetUserId)
          .select()
          .single();

        if (updateErr) {
          console.warn('Supabase update max_user_id warning:', updateErr.message);
        } else if (updatedProfile) {
          const userObj: User = {
            id: updatedProfile.id,
            name: updatedProfile.name,
            email: updatedProfile.email,
            avatar_url: updatedProfile.avatar_url,
            birthday: updatedProfile.birthday,
            telegram_id: updatedProfile.telegram_id,
            telegram_username: updatedProfile.telegram_username,
            max_user_id: updatedProfile.max_user_id,
            created_at: updatedProfile.created_at,
          };
          this.setCachedUser(userObj);
          return { success: true, user: userObj };
        }
      } catch (err: unknown) {
        console.warn('Error linking MAX in Supabase:', err);
      }
    }

    // Local storage fallback
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const userIndex = users.findIndex((u) => u.id === targetUserId);
    if (userIndex !== -1) {
      users[userIndex].max_user_id = midStr;
      if (maxUser.photo_url) users[userIndex].avatar_url = maxUser.photo_url;
      localStore.set(STORAGE_USERS, users);
      localStore.set(STORAGE_SESSION, users[userIndex].id);
      this.setCachedUser(users[userIndex]);
      return { success: true, user: users[userIndex] };
    }

    return { success: true };
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
          this.setCachedUser(userObj);
          return { success: true, user: userObj };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка регистрации в Supabase';
        return { success: false, error: msg };
      }
    }

    const users = localStore.get<User[]>(STORAGE_USERS, []);
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
    localStore.set(STORAGE_USERS, users);
    localStore.set(STORAGE_SESSION, newUser.id);

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
            name:
              profile?.name ||
              (data.user.user_metadata?.name as string) ||
              cleanEmail.split('@')[0],
            email: cleanEmail,
            avatar_url: profile?.avatar_url,
            birthday: profile?.birthday,
            telegram_id: profile?.telegram_id,
            telegram_username: profile?.telegram_username,
            max_user_id: profile?.max_user_id,
            created_at: data.user.created_at,
          };
          this.setCachedUser(userObj);
          return { success: true, user: userObj };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка входа в Supabase';
        return { success: false, error: msg };
      }
    }

    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const user = users.find((u) => u.email === cleanEmail && u.password === password);
    if (!user) {
      return { success: false, error: 'Неверный email или пароль' };
    }
    localStore.set(STORAGE_SESSION, user.id);
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
    localStore.remove(STORAGE_SESSION);
    localStore.remove(STORAGE_GROUPS);
    localStore.remove(STORAGE_MEMBERSHIPS);
  }

  // --- Telegram & MAX Platform Integration ---

  /**
   * Find an existing user bound to a Telegram ID (0-click auto-login)
   */
  public async findUserByTelegramId(
    telegramId: number | string
  ): Promise<User | null> {
    const tidStr = String(telegramId);
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_id', tidStr)
          .maybeSingle();

        if (profile) {
          const userObj: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            birthday: profile.birthday,
            telegram_id: profile.telegram_id,
            telegram_username: profile.telegram_username,
            max_user_id: profile.max_user_id,
            created_at: profile.created_at,
          };
          this.setCachedUser(userObj);
          return userObj;
        }
      } catch (err) {
        console.error('Error finding user by telegram_id in Supabase:', err);
      }
    }

    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const localUser = users.find((u) => String(u.telegram_id) === tidStr);
    if (localUser) {
      localStore.set(STORAGE_SESSION, localUser.id);
      this.setCachedUser(localUser);
      return localUser;
    }
    return null;
  }

  /**
   * Link an existing family member to a Telegram account
   */
  public async linkTelegramToUser(
    targetUserId: string,
    tgUser: { id: number | string; first_name: string; last_name?: string; username?: string; photo_url?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const tidStr = String(tgUser.id);

    if (isSupabaseConfigured() && supabase) {
      try {
        // Verify no other profile already has this telegram_id
        const { data: existingOther } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('telegram_id', tidStr)
          .maybeSingle();

        if (existingOther && existingOther.id !== targetUserId) {
          return {
            success: false,
            error: `Этот Telegram аккаунт уже привязан к «${existingOther.name}»`,
          };
        }

        const updatePayload: Record<string, unknown> = {
          telegram_id: tidStr,
        };
        if (tgUser.username) {
          updatePayload.telegram_username = tgUser.username;
        }
        if (tgUser.photo_url) {
          updatePayload.avatar_url = tgUser.photo_url;
        }

        const { data: updatedProfile, error: updateErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', targetUserId)
          .select()
          .single();

        if (updateErr) {
          return { success: false, error: updateErr.message };
        }

        const userObj: User = {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          avatar_url: updatedProfile.avatar_url,
          birthday: updatedProfile.birthday,
          telegram_id: updatedProfile.telegram_id,
          telegram_username: updatedProfile.telegram_username,
          max_user_id: updatedProfile.max_user_id,
          created_at: updatedProfile.created_at,
        };

        this.setCachedUser(userObj);
        return { success: true, user: userObj };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка привязки Telegram';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const userIndex = users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      return { success: false, error: 'Пользователь не найден' };
    }

    users[userIndex].telegram_id = tidStr;
    if (tgUser.username) users[userIndex].telegram_username = tgUser.username;
    if (tgUser.photo_url) users[userIndex].avatar_url = tgUser.photo_url;

    localStore.set(STORAGE_USERS, users);
    localStore.set(STORAGE_SESSION, users[userIndex].id);
    this.setCachedUser(users[userIndex]);

    return { success: true, user: users[userIndex] };
  }

  /**
   * Create a brand new family member and instantly link their Telegram profile
   */
  public async createAndLinkTelegramUser(
    groupId: string,
    tgUser: { id: number | string; first_name: string; last_name?: string; username?: string; photo_url?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Родственник';
    const tidStr = String(tgUser.id);

    if (isSupabaseConfigured() && supabase) {
      try {
        const deterministicEmail = `tg_${tidStr}@family.local`;
        const deterministicPassword = `pwd_tg_${tidStr}_wishlist2026`;

        let userId = '';
        let userCreatedAt = new Date().toISOString();

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: deterministicEmail,
          password: deterministicPassword,
        });

        if (!signInErr && signInData.user) {
          userId = signInData.user.id;
          userCreatedAt = signInData.user.created_at;
        } else {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: deterministicEmail,
            password: deterministicPassword,
            options: {
              data: { name: fullName },
            },
          });
          if (signUpErr || !signUpData.user) {
            return { success: false, error: signUpErr?.message || 'Ошибка создания аккаунта' };
          }
          userId = signUpData.user.id;
          userCreatedAt = signUpData.user.created_at;
        }

        // Upsert profile with telegram details
        await supabase.from('profiles').upsert({
          id: userId,
          name: fullName,
          email: deterministicEmail,
          avatar_url: tgUser.photo_url || null,
          telegram_id: tidStr,
          telegram_username: tgUser.username || null,
        });

        // Add to family group
        await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: userId,
        });

        const userObj: User = {
          id: userId,
          name: fullName,
          email: deterministicEmail,
          avatar_url: tgUser.photo_url,
          telegram_id: tidStr,
          telegram_username: tgUser.username,
          created_at: userCreatedAt,
        };

        this.setCachedUser(userObj);
        return { success: true, user: userObj };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка создания профиля Telegram';
        return { success: false, error: msg };
      }
    }

    // Local fallback
    const newUser: User = {
      id: `user-tg-${tidStr}`,
      name: fullName,
      email: `tg_${tidStr}@family.local`,
      avatar_url: tgUser.photo_url,
      telegram_id: tidStr,
      telegram_username: tgUser.username,
      created_at: new Date().toISOString(),
    };

    const users = localStore.get<User[]>(STORAGE_USERS, []);
    users.push(newUser);
    localStore.set(STORAGE_USERS, users);

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    memberships.push({ group_id: groupId, user_id: newUser.id });
    localStore.set(STORAGE_MEMBERSHIPS, memberships);

    localStore.set(STORAGE_SESSION, newUser.id);
    this.setCachedUser(newUser);

    return { success: true, user: newUser };
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

    const memberships = localStore
      .get<{ group_id: string; user_id: string }[]>(STORAGE_MEMBERSHIPS, [])
      .filter((m) => m.user_id === userId);
    const groups = localStore.get<FamilyGroup[]>(STORAGE_GROUPS, []);
    return groups.filter((g) => memberships.some((m) => m.group_id === g.id));
  }

  public async createGroup(
    name: string,
    creatorId: string
  ): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
    const cleanName = name.trim();
    const code =
      cleanName.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

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
          return {
            success: false,
            error: groupErr?.message || 'Ошибка создания группы в базе',
          };
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

    const groups = localStore.get<FamilyGroup[]>(STORAGE_GROUPS, []);
    const newGroup: FamilyGroup = {
      id: `group-${Date.now()}`,
      name: cleanName,
      invite_code: code,
      created_by: creatorId,
      created_at: new Date().toISOString(),
    };
    groups.push(newGroup);
    localStore.set(STORAGE_GROUPS, groups);

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    memberships.push({ group_id: newGroup.id, user_id: creatorId });
    localStore.set(STORAGE_MEMBERSHIPS, memberships);

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

    const groups = localStore.get<FamilyGroup[]>(STORAGE_GROUPS, []);
    const group = groups.find((g) => g.invite_code === code);
    if (!group) return { success: false, error: 'Группа не найдена' };

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    if (memberships.some((m) => m.group_id === group.id && m.user_id === userId)) {
      return { success: false, error: 'Вы уже состоите в этой группе' };
    }
    memberships.push({ group_id: group.id, user_id: userId });
    localStore.set(STORAGE_MEMBERSHIPS, memberships);

    return { success: true, group };
  }

  public async getFamilyMembers(userId: string, groupId?: string): Promise<User[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let targetGroupId = groupId;
        if (!targetGroupId || targetGroupId === 'all') {
          const { data: myMemberships } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .limit(1);
          targetGroupId = myMemberships?.[0]?.group_id;
        }

        if (!targetGroupId) {
          const { data: me } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          return me ? [me] : [];
        }

        // Strictly query ONLY members of this specific group
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', targetGroupId);

        const userIds = Array.from(new Set((groupMembers || []).map((m) => m.user_id)));
        if (!userIds.includes(userId)) {
          userIds.push(userId);
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const result = (profiles || []).sort((a, b) => {
          if (a.id === userId) return -1;
          if (b.id === userId) return 1;
          return a.name.localeCompare(b.name, 'ru');
        });
        this.setCachedMembers(result, targetGroupId);
        return result;
      } catch (err) {
        console.error('Error fetching family members from Supabase:', err);
      }
    }

    const targetGroupId =
      groupId && groupId !== 'all'
        ? groupId
        : (await this.getUserGroups(userId))[0]?.id;

    if (!targetGroupId) return [];

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const relatedUserIds = new Set<string>([userId]);

    memberships.forEach((m) => {
      if (m.group_id === targetGroupId) relatedUserIds.add(m.user_id);
    });

    const localMembers = users
      .filter((u) => relatedUserIds.has(u.id))
      .sort((a, b) => {
        if (a.id === userId) return -1;
        if (b.id === userId) return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
    this.setCachedMembers(localMembers, targetGroupId);
    return localMembers;
  }

  /**
   * Preload wishes and reservations for all family members at once
   * so that switching between family members is 100% instant (0ms).
   */
  public async syncAllFamilyWishes(familyUserIds: string[]): Promise<void> {
    if (!isSupabaseConfigured() || !supabase || familyUserIds.length === 0) return;
    try {
      const [wishesRes, resRes] = await Promise.all([
        supabase
          .from('wishes')
          .select('*')
          .in('user_id', familyUserIds)
          .order('created_at', { ascending: false }),
        supabase.from('reservations').select('*'),
      ]);

      if (wishesRes.data) {
        localStore.set(STORAGE_WISHES, wishesRes.data);
      }
      if (resRes.data) {
        localStore.set(STORAGE_RESERVATIONS, resRes.data);
      }
    } catch (e) {
      console.warn('Batch preload wishes error:', e);
    }
  }

  // --- Wishes & Anti-Spoiler ---

  public getLocalWishes(targetUserId: string, viewerId: string) {
    const localWishes = localStore
      .get<Wish[]>(STORAGE_WISHES, [])
      .filter((w) => w.user_id === targetUserId);
    const localReservations = localStore.get<Reservation[]>(STORAGE_RESERVATIONS, []);
    return applyAntiSpoiler(localWishes, localReservations, viewerId, targetUserId);
  }

  public async getWishesForUser(targetUserId: string, viewerId: string) {
    let remoteWishes: DisplayWish[] = [];
    let remoteFetched = false;

    if (isSupabaseConfigured() && supabase && isUUID(targetUserId)) {
      try {
        const { data: wishes, error } = await supabase
          .from('wishes')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!error && wishes) {
          remoteFetched = true;
          if (wishes.length === 0) {
            remoteWishes = [];
          } else if (targetUserId === viewerId) {
            remoteWishes = wishes.map((w) => ({
              ...w,
              is_reserved: false,
              reserved_by_me: false,
            }));
          } else {
            const wishIds = wishes.map((w) => w.id);
            const { data: reservations } = await supabase
              .from('reservations')
              .select('*')
              .in('wish_id', wishIds);

            remoteWishes = applyAntiSpoiler(
              wishes,
              reservations || [],
              viewerId,
              targetUserId
            );
          }

          // Safely merge into local storage: keep wishes of other family members, update only targetUserId
          const allStored = localStore.get<Wish[]>(STORAGE_WISHES, []);
          const otherStored = allStored.filter((w) => w.user_id !== targetUserId);
          localStore.set(STORAGE_WISHES, [...otherStored, ...wishes]);
        }
      } catch (err) {
        console.warn('Error fetching wishes from Supabase:', err);
      }
    }

    const formattedLocal = this.getLocalWishes(targetUserId, viewerId);

    if (!remoteFetched) {
      return formattedLocal;
    }

    // Only prepend locally created offline wishes that are still pending sync
    const pendingLocal = formattedLocal.filter((lw) => String(lw.id).startsWith('wish-'));
    return [...pendingLocal, ...remoteWishes];
  }

  public async toggleReservation(wishId: string, viewerId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase && isUUID(wishId)) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData.user?.id || (isUUID(viewerId) ? viewerId : null);

        if (activeUserId) {
          const { data: existing } = await supabase
            .from('reservations')
            .select('*')
            .eq('wish_id', wishId)
            .maybeSingle();

          if (existing) {
            if (existing.reserved_by === activeUserId) {
              await supabase.from('reservations').delete().eq('wish_id', wishId);
            }
          } else {
            await supabase.from('reservations').insert({
              wish_id: wishId,
              reserved_by: activeUserId,
            });
          }
        }
      } catch (err) {
        console.warn('Error toggling reservation in Supabase:', err);
      }
    }

    const reservations = localStore.get<Reservation[]>(STORAGE_RESERVATIONS, []);
    const idx = reservations.findIndex((r) => r.wish_id === wishId);
    if (idx >= 0) {
      if (reservations[idx].reserved_by === viewerId) {
        reservations.splice(idx, 1);
        localStore.set(STORAGE_RESERVATIONS, reservations);
        return true;
      }
      return false;
    }
    reservations.push({
      id: 'res-' + Date.now(),
      wish_id: wishId,
      reserved_by: viewerId,
      created_at: new Date().toISOString(),
    });
    localStore.set(STORAGE_RESERVATIONS, reservations);
    return true;
  }

  public async addWish(wishData: Omit<Wish, 'id' | 'created_at'>): Promise<Wish> {
    const cleanWishData = {
      title: wishData.title.trim(),
      description: wishData.description?.trim() || null,
      link_url: wishData.link_url?.trim() || null,
      image_url: wishData.image_url?.trim() || null,
      price:
        typeof wishData.price === 'number' && !isNaN(wishData.price) && wishData.price > 0
          ? wishData.price
          : null,
      currency: wishData.currency || '₽',
      priority: wishData.priority || 'nice_to_have',
      event_tag: wishData.event_tag || 'Без повода',
    };

    let remoteWish: Wish | null = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        let activeUserId: string | null = null;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          activeUserId = sessionData.session.user.id;
        } else {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            activeUserId = authData.user.id;
          }
        }

        if (!activeUserId && isUUID(wishData.user_id)) {
          activeUserId = wishData.user_id;
        }

        if (activeUserId && isUUID(activeUserId)) {
          const { data, error } = await supabase
            .from('wishes')
            .insert({
              ...cleanWishData,
              user_id: activeUserId,
            })
            .select()
            .single();

          if (!error && data) {
            remoteWish = data;
          } else {
            console.warn('Supabase insert wish warning:', error);
          }
        }
      } catch (err) {
        console.warn('Supabase addWish exception:', err);
      }
    }

    const wishes = localStore.get<Wish[]>(STORAGE_WISHES, []);
    const localWish: Wish = remoteWish || {
      ...cleanWishData,
      id: 'wish-' + Date.now(),
      user_id: wishData.user_id,
      created_at: new Date().toISOString(),
      price: cleanWishData.price ?? undefined,
      description: cleanWishData.description ?? undefined,
      link_url: cleanWishData.link_url ?? undefined,
      image_url: cleanWishData.image_url ?? undefined,
    };

    const idx = wishes.findIndex((w) => w.id === localWish.id);
    if (idx >= 0) {
      wishes[idx] = localWish;
    } else {
      wishes.unshift(localWish);
    }
    localStore.set(STORAGE_WISHES, wishes);

    return localWish;
  }

  public async deleteWish(wishId: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase && isUUID(wishId)) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeUserId = sessionData?.session?.user?.id || (isUUID(userId) ? userId : null);

        if (activeUserId) {
          await supabase
            .from('wishes')
            .delete()
            .eq('id', wishId)
            .eq('user_id', activeUserId);
        }
      } catch (err) {
        console.warn('Supabase deleteWish error:', err);
      }
    }

    const wishes = localStore.get<Wish[]>(STORAGE_WISHES, []);
    localStore.set(
      STORAGE_WISHES,
      wishes.filter((w) => w.id !== wishId)
    );
    localStore.set(
      STORAGE_RESERVATIONS,
      localStore
        .get<Reservation[]>(STORAGE_RESERVATIONS, [])
        .filter((r) => r.wish_id !== wishId)
    );
    return true;
  }

  public async getMyReservations(viewerId: string): Promise<DisplayWish[]> {
    let remoteReservations: DisplayWish[] = [];
    let remoteSuccess = false;

    if (isSupabaseConfigured() && supabase && isUUID(viewerId)) {
      try {
        const { data: reservations } = await supabase
          .from('reservations')
          .select('wish_id')
          .eq('reserved_by', viewerId);

        const wishIds = (reservations || []).map((r) => r.wish_id);
        if (wishIds.length > 0) {
          const { data: wishes } = await supabase
            .from('wishes')
            .select('*')
            .in('id', wishIds);

          if (wishes && wishes.length > 0) {
            const userIds = Array.from(new Set(wishes.map((w) => w.user_id)));
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', userIds);

            const profileMap = new Map((profiles || []).map((p) => [p.id, p.name]));

            remoteReservations = wishes.map((w) => ({
              ...w,
              is_reserved: true,
              reserved_by_me: true,
              owner_name: profileMap.get(w.user_id) || 'Родственник',
            }));
            remoteSuccess = true;
          }
        } else {
          remoteSuccess = true;
        }
      } catch (err) {
        console.warn('Error fetching my reservations from Supabase:', err);
      }
    }

    const reservations = localStore
      .get<Reservation[]>(STORAGE_RESERVATIONS, [])
      .filter((r) => r.reserved_by === viewerId);
    const wishIds = new Set(reservations.map((r) => r.wish_id));
    const allWishes = localStore.get<Wish[]>(STORAGE_WISHES, []);
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const localList: DisplayWish[] = allWishes
      .filter((w) => wishIds.has(w.id))
      .map((w) => ({
        ...w,
        is_reserved: true,
        reserved_by_me: true,
        owner_name: userMap.get(w.user_id) || 'Родственник',
      }));

    if (!remoteSuccess) return localList;

    const merged = [...remoteReservations];
    for (const item of localList) {
      if (!merged.some((r) => r.id === item.id)) {
        merged.push(item);
      }
    }
    return merged;
  }
}

export const dataStore = new WishlistDataStore();
