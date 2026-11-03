'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { Navbar } from '@/components/Navbar';
import { FamilyBar } from '@/components/FamilyBar';
import { WishCard } from '@/components/WishCard';
import { AddWishModal } from '@/components/AddWishModal';
import { FamilyGroupModal } from '@/components/FamilyGroupModal';
import { AuthScreen } from '@/components/AuthScreen';
import { Gift, PlusCircle, Users, Share2, Check } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [copiedGroupLink, setCopiedGroupLink] = useState(false);
  const [wishes, setWishes] = useState<
    (Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('Все');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Инициализация при монтировании
  useEffect(() => {
    // 1. Мгновенная инициализация из кэша (0мс)
    const cachedUser = dataStore.getCachedUser();
    const cachedGroups = dataStore.getCachedGroups();
    const cachedMembers = dataStore.getCachedMembers();

    if (cachedUser) {
      setCurrentUser(cachedUser);
      if (cachedGroups && cachedGroups.length > 0) {
        setUserGroups(cachedGroups);
        setSelectedGroupId(cachedGroups[0].id);
      }
      if (cachedMembers && cachedMembers.length > 0) {
        setFamilyMembers(cachedMembers);
        setSelectedUserId(cachedUser.id);
      }
      setIsDataLoaded(true);
      setIsAppLoading(false);
    }

    // 2. Фоновая проверка и актуализация с Supabase
    const init = async () => {
      try {
        const user = await dataStore.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          await loadUserData(user.id);
        } else {
          setCurrentUser(null);
          setUserGroups([]);
          setFamilyMembers([]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsDataLoaded(true);
        setIsAppLoading(false);
      }
    };
    init();
  }, []);

  const loadUserData = async (userId: string, preferredGroupId?: string) => {
    const groups = await dataStore.getUserGroups(userId);
    setUserGroups(groups);

    let activeGroupId = preferredGroupId;
    if (!activeGroupId) {
      if (selectedGroupId && (groups.some((g) => g.id === selectedGroupId) || selectedGroupId === 'all')) {
        activeGroupId = selectedGroupId;
      } else {
        activeGroupId = groups[0]?.id || 'all';
      }
    }
    setSelectedGroupId(activeGroupId);

    const members = await dataStore.getFamilyMembers(userId, activeGroupId);
    setFamilyMembers(members);
    dataStore.setCachedMembers(members);

    const activeTargetId = selectedUserId && members.some((m) => m.id === selectedUserId)
      ? selectedUserId
      : userId;

    setSelectedUserId(activeTargetId);
    await loadWishes(activeTargetId, userId);
    setIsDataLoaded(true);
  };

  const handleSwitchGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!currentUser) return;

    const members = await dataStore.getFamilyMembers(currentUser.id, groupId);
    setFamilyMembers(members);

    const targetId = members.some((m) => m.id === selectedUserId)
      ? selectedUserId
      : currentUser.id;

    setSelectedUserId(targetId);
    await loadWishes(targetId, currentUser.id);
  };

  const handleShareGroup = (code: string) => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname.replace(/\/$/, '');
      const shareUrl = `${origin}${pathname}/?code=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedGroupLink(true);
      setTimeout(() => setCopiedGroupLink(false), 2000);
    }
  };

  const loadWishes = async (targetId: string, viewerId: string) => {
    const list = await dataStore.getWishesForUser(targetId, viewerId);
    setWishes(list);
  };

  const handleSelectUser = async (id: string) => {
    setSelectedUserId(id);
    if (currentUser) {
      await loadWishes(id, currentUser.id);
    }
  };

  const handleAuth = async (user: User) => {
    setCurrentUser(user);
    await loadUserData(user.id);
  };

  const handleLogout = async () => {
    await dataStore.logout();
    setCurrentUser(null);
    setFamilyMembers([]);
    setUserGroups([]);
    setWishes([]);
    setSelectedUserId('');
  };

  const handleGroupsUpdated = async () => {
    if (currentUser) {
      await loadUserData(currentUser.id);
    }
  };

  const handleToggleReserve = async (wishId: string) => {
    if (!currentUser) return;
    await dataStore.toggleReservation(wishId, currentUser.id);
    await loadWishes(selectedUserId, currentUser.id);
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!currentUser) return;
    if (confirm('Удалить это желание?')) {
      await dataStore.deleteWish(wishId, currentUser.id);
      await loadWishes(selectedUserId, currentUser.id);
    }
  };

  const handleAddWish = async (wishData: Omit<Wish, 'id' | 'created_at'>) => {
    if (!currentUser) return;
    await dataStore.addWish(wishData);
    await loadWishes(selectedUserId, currentUser.id);
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-md shadow-warm-300/30 flex items-center justify-center mb-3 animate-pulse">
          <Gift className="w-7 h-7 text-accent" strokeWidth={1.5} />
        </div>
        <div className="text-sm font-semibold text-warm-800 tracking-tight">Семейный Вишлист</div>
        <div className="text-xs text-warm-400 mt-1">Загрузка данных...</div>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onSuccess={handleAuth} />;

  const activeGroup = userGroups.find((g) => g.id === selectedGroupId);
  const selectedMember = familyMembers.find((m) => m.id === selectedUserId) || currentUser;
  const isOwner = currentUser.id === selectedMember.id;
  const events = ['Все', 'День рождения', 'Новый год', 'Без повода'];
  const filteredWishes = wishes.filter(
    (w) => selectedEvent === 'Все' || w.event_tag === selectedEvent
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        currentUser={currentUser}
        onOpenAddWish={() => setIsAddOpen(true)}
        onOpenGroups={() => setIsGroupsOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl w-full mx-auto px-5 sm:px-8 py-8 flex-1 space-y-7">
        {/* Onboarding — только если данные загружены и групп реально 0 */}
        {isDataLoaded && userGroups.length === 0 ? (
          <div className="bg-white border border-warm-200/60 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto shadow-sm shadow-warm-200/20">
            <div className="w-16 h-16 rounded-3xl bg-accent/8 text-accent flex items-center justify-center mx-auto mb-5">
              <Users className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-warm-900 mb-2">
              Привет, {currentUser.name}!
            </h2>
            <p className="text-sm text-warm-500 mb-7 leading-relaxed max-w-sm mx-auto">
              Создайте семейный круг и отправьте код приглашения близким — они смогут видеть ваши желания и бронировать подарки в облаке Supabase.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-6 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm shadow-sm shadow-accent/15 transition-all cursor-pointer"
              >
                Создать семью
              </button>
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-6 py-3 rounded-2xl bg-white border border-warm-200 text-warm-600 font-medium text-sm hover:bg-warm-50 transition-all cursor-pointer"
              >
                У меня есть код
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Переключатель семейных кругов */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 border border-warm-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-[11px] font-semibold text-warm-400 uppercase tracking-wider px-2 shrink-0 hidden md:inline">
                  Круг:
                </span>

                {userGroups.map((group) => {
                  const isActive = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSwitchGroup(group.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-warm-900 text-white shadow-sm shadow-warm-900/15'
                          : 'bg-warm-100/70 hover:bg-warm-100 text-warm-700'
                      }`}
                    >
                      <Users className={`w-3.5 h-3.5 ${isActive ? 'text-warm-300' : 'text-warm-400'}`} />
                      <span>{group.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-warm-500 border border-warm-200/60'
                        }`}
                      >
                        {group.invite_code}
                      </span>
                    </button>
                  );
                })}

                {userGroups.length > 1 && (
                  <button
                    onClick={() => handleSwitchGroup('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedGroupId === 'all'
                        ? 'bg-warm-900 text-white shadow-sm'
                        : 'bg-warm-100/70 hover:bg-warm-100 text-warm-600'
                    }`}
                  >
                    Все родные
                  </button>
                )}

                <button
                  onClick={() => setIsGroupsOpen(true)}
                  title="Создать или войти в другую семью"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-warm-500 hover:text-warm-800 hover:bg-warm-100 border border-dashed border-warm-300 transition-all cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Еще семья</span>
                </button>
              </div>

              {/* Быстрая ссылка для приглашения в активную семью */}
              {activeGroup && (
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pl-1 sm:pl-0">
                  <button
                    onClick={() => handleShareGroup(activeGroup.invite_code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-accent/10 hover:bg-accent/20 text-accent transition-all cursor-pointer"
                    title="Скопировать ссылку для родственников этой семьи"
                  >
                    {copiedGroupLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Ссылка скопирована!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Пригласить в {activeGroup.name}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Family bar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-warm-400 uppercase tracking-wider">
                  {selectedGroupId === 'all'
                    ? 'Все родственники'
                    : `Участники «${activeGroup?.name || 'Семья'}»`}
                </p>
                <button
                  onClick={() => setIsGroupsOpen(true)}
                  className="text-[11px] text-accent hover:text-accent-hover font-semibold cursor-pointer transition-colors"
                >
                  Коды и группы →
                </button>
              </div>
              <FamilyBar
                members={familyMembers}
                selectedUserId={selectedUserId}
                onSelectUser={handleSelectUser}
                currentUserId={currentUser.id}
              />
            </div>

            {/* Header of selected user */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h1 className="text-2xl font-semibold text-warm-900 tracking-tight">
                  {isOwner ? 'Мой вишлист' : `Вишлист: ${selectedMember.name}`}
                </h1>
                <p className="text-sm text-warm-400 mt-0.5">
                  {isOwner
                    ? 'Добавляйте желания — близкие увидят их и смогут забронировать'
                    : `Забронируйте подарок, чтобы ${selectedMember.name} не узнал(а)`}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-sm shadow-accent/15 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  Добавить
                </button>
              )}
            </div>

            {/* Event filter */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {events.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedEvent(tag)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedEvent === tag
                      ? 'bg-warm-800 text-white shadow-sm'
                      : 'bg-white border border-warm-200/70 text-warm-500 hover:text-warm-700 hover:border-warm-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <span className="text-[11px] text-warm-300 font-medium ml-auto shrink-0 pl-3">
                {filteredWishes.length} {filteredWishes.length === 1 ? 'желание' : 'желаний'}
              </span>
            </div>

            {/* Wishes grid */}
            {filteredWishes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredWishes.map((wish) => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    isOwner={isOwner}
                    onToggleReserve={handleToggleReserve}
                    onDeleteWish={handleDeleteWish}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-warm-200/60 rounded-3xl p-14 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-warm-100 text-warm-300 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-warm-800 mb-1">Пока пусто</h3>
                <p className="text-xs text-warm-400 max-w-xs mx-auto mb-5">
                  {isOwner
                    ? 'Добавьте первое желание — вставьте ссылку на товар, и карточка заполнится автоматически'
                    : `${selectedMember.name} ещё не добавил(а) желания`}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-sm shadow-accent/15 transition-all cursor-pointer"
                  >
                    + Добавить желание
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <AddWishModal
        isOpen={isAddOpen}
        currentUserId={currentUser.id}
        onClose={() => setIsAddOpen(false)}
        onAddWish={handleAddWish}
      />
      <FamilyGroupModal
        isOpen={isGroupsOpen}
        currentUser={currentUser}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSwitchGroup}
        onClose={() => setIsGroupsOpen(false)}
        onUpdate={handleGroupsUpdated}
      />
    </div>
  );
}
