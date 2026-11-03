'use client';

import React, { useState, useEffect } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { Navbar } from '@/components/Navbar';
import { FamilyBar } from '@/components/FamilyBar';
import { WishCard } from '@/components/WishCard';
import { AddWishModal } from '@/components/AddWishModal';
import { FamilyGroupModal } from '@/components/FamilyGroupModal';
import { AuthScreen } from '@/components/AuthScreen';
import { Gift, Plus, Users, Share2, Check, Lock } from 'lucide-react';

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

  // Initialize on mount
  useEffect(() => {
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
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center mb-3">
          <Gift className="w-5 h-5 stroke-[1.75]" />
        </div>
        <div className="text-xs font-mono tracking-wider uppercase text-stone-400">
          Загрузка...
        </div>
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

  const reservedWishes = wishes.filter((w) => w.is_reserved).length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onOpenAddWish={() => setIsAddOpen(true)}
        onOpenGroups={() => setIsGroupsOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Onboarding - when 0 groups */}
        {isDataLoaded && userGroups.length === 0 ? (
          <div className="bg-white border border-stone-200/90 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mb-1.5 tracking-tight">
              Добро пожаловать, {currentUser.name}!
            </h2>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Создайте первый семейный круг и поделитесь кодом с близкими, чтобы делиться желаниями и бронировать подарки без спойлеров.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer"
              >
                Создать семью
              </button>
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition-all cursor-pointer"
              >
                Войти по коду
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Minimalist Top Control Bar */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 px-1.5 shrink-0 hidden md:inline">
                  Круг:
                </span>

                {userGroups.map((group) => {
                  const isActive = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSwitchGroup(group.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-stone-100/80 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      <span>{group.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isActive
                            ? 'bg-stone-800 text-stone-300'
                            : 'bg-white text-stone-500 border border-stone-200'
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      selectedGroupId === 'all'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                    }`}
                  >
                    Все круги
                  </button>
                )}

                <button
                  onClick={() => setIsGroupsOpen(true)}
                  title="Создать или войти в другую семью"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-dashed border-stone-300 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Круг</span>
                </button>
              </div>

              {/* Share invite button */}
              {activeGroup && (
                <div className="flex items-center gap-2 shrink-0 self-start md:self-auto pl-1 md:pl-0">
                  <button
                    onClick={() => handleShareGroup(activeGroup.invite_code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
                    title="Скопировать ссылку с кодом для родственников"
                  >
                    {copiedGroupLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-stone-900 stroke-[2.5]" />
                        <span>Ссылка скопирована</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>Пригласить родных</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Member selector strip */}
            <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-stone-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  / Участники
                </span>
                <button
                  onClick={() => setIsGroupsOpen(true)}
                  className="text-xs text-stone-500 hover:text-stone-900 font-medium cursor-pointer transition-colors"
                >
                  Управление →
                </button>
              </div>
              <FamilyBar
                members={familyMembers}
                selectedUserId={selectedUserId}
                onSelectUser={handleSelectUser}
                currentUserId={currentUser.id}
              />
            </div>

            {/* Wishlist Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pt-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
                    {isOwner ? 'Мой вишлист' : `Вишлист: ${selectedMember.name}`}
                  </h1>
                  {!isOwner && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 text-stone-600 border border-stone-200">
                      <Lock className="w-2.5 h-2.5 stroke-[2]" />
                      Анти-спойлер
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {isOwner
                    ? 'Ваши желания. Близкие видят их и могут тайно бронировать подарки.'
                    : `Забронируйте подарок для ${selectedMember.name}, чтобы избежать повторов. Виновник торжества не увидит бронь.`}
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
                  <span>Добавить подарок</span>
                </button>
              )}
            </div>

            {/* Filter pills & counts */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                {events.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedEvent(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedEvent === tag
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-white border border-stone-200/90 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-stone-400 shrink-0 pl-3">
                {filteredWishes.length} {filteredWishes.length === 1 ? 'желание' : 'желаний'}
                {!isOwner && reservedWishes > 0 && ` • ${reservedWishes} забронировано`}
              </div>
            </div>

            {/* Wishes Grid */}
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
              <div className="bg-white border border-stone-200/90 rounded-2xl p-10 sm:p-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="font-medium text-stone-900 text-sm mb-1">
                  Список желаний пуст
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto mb-5 leading-relaxed">
                  {isOwner
                    ? 'Добавьте первое желание — просто вставьте ссылку на товар, и карточка заполнится автоматически.'
                    : `${selectedMember.name} пока не добавил(а) ни одного подарка.`}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer"
                  >
                    + Добавить первое желание
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
