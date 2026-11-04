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

  public getCachedMembers(): User[] {
    return localStore.getCachedMembers();
  }

  public setCachedMembers(members: User[]): void {
    localStore.setCachedMembers(members);
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
              birthday: profile.birthday,
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

        const result = profiles || [];
        this.setCachedMembers(result);
        return result;
      } catch (err) {
        console.error('Error fetching family members from Supabase:', err);
      }
    }

    const targetGroupIds =
      groupId && groupId !== 'all'
        ? [groupId]
        : (await this.getUserGroups(userId)).map((g) => g.id);

    const memberships = localStore.get<{ group_id: string; user_id: string }[]>(
      STORAGE_MEMBERSHIPS,
      []
    );
    const users = localStore.get<User[]>(STORAGE_USERS, []);
    const relatedUserIds = new Set<string>([userId]);

    memberships.forEach((m) => {
      if (targetGroupIds.includes(m.group_id)) relatedUserIds.add(m.user_id);
    });

    const localMembers = users.filter((u) => relatedUserIds.has(u.id));
    this.setCachedMembers(localMembers);
    return localMembers;
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
          const isOwner = targetUserId === viewerId;
          if (isOwner) {
            remoteWishes = wishes.map((w) => ({
              ...w,
              is_reserved: false,
              reserved_by_me: false,
            }));
            localStore.set(STORAGE_WISHES, wishes);
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
        }
      } catch (err) {
        console.warn('Error fetching wishes from Supabase:', err);
      }
    }

    const formattedLocal = this.getLocalWishes(targetUserId, viewerId);

    if (!remoteFetched) {
      return formattedLocal;
    }

    const merged = [...remoteWishes];
    for (const lw of formattedLocal) {
      const exists = merged.some(
        (rw) =>
          rw.id === lw.id ||
          (rw.title === lw.title &&
            Math.abs(new Date(rw.created_at).getTime() - new Date(lw.created_at).getTime()) < 60000)
      );
      if (!exists) {
        merged.unshift(lw);
      }
    }
    return merged;
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
