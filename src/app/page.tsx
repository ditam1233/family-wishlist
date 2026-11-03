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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center mb-4 animate-bounce">
          <Gift className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <div className="text-base font-bold text-slate-900 tracking-tight">Family Wishlist</div>
        <div className="text-xs text-slate-400 mt-1">Загрузка данных...</div>
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

  const totalWishes = wishes.length;
  const reservedWishes = wishes.filter((w) => w.is_reserved).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onOpenAddWish={() => setIsAddOpen(true)}
        onOpenGroups={() => setIsGroupsOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 space-y-6">
        {/* Onboarding — только если данные загружены и групп реально 0 */}
        {isDataLoaded && userGroups.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xl shadow-slate-200/50">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5 border border-indigo-100">
              <Users className="w-8 h-8" strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Привет, {currentUser.name}!
            </h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
              Создайте первый семейный круг и поделитесь кодом с близкими — каждый сможет вести свой вишлист и тайно бронировать подарки.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
              >
                Создать семью
              </button>
              <button
                onClick={() => setIsGroupsOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                У меня есть код
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Переключатель семейных кругов */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0 hidden md:inline">
                  Круг:
                </span>

                {userGroups.map((group) => {
                  const isActive = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSwitchGroup(group.id)}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                          : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      <Users className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                      <span>{group.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
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
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedGroupId === 'all'
                        ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Все родственники
                  </button>
                )}

                <button
                  onClick={() => setIsGroupsOpen(true)}
                  title="Создать или войти в другую семью"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 transition-all cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Новый круг</span>
                </button>
              </div>

              {/* Кнопка приглашения в активную семью */}
              {activeGroup && (
                <div className="flex items-center gap-2 shrink-0 self-start md:self-auto pl-1 md:pl-0">
                  <button
                    onClick={() => handleShareGroup(activeGroup.invite_code)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 shadow-xs transition-all cursor-pointer"
                    title="Скопировать готовую ссылку с кодом для родственников"
                  >
                    {copiedGroupLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Ссылка скопирована!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-indigo-600" />
                        <span>Пригласить в «{activeGroup.name}»</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Member selector strip */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {selectedGroupId === 'all'
                    ? 'Все члены кругов'
                    : `Участники «${activeGroup?.name || 'Семья'}»`}
                </p>
                <button
                  onClick={() => setIsGroupsOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer transition-colors"
                >
                  Управление семьями →
                </button>
              </div>
              <FamilyBar
                members={familyMembers}
                selectedUserId={selectedUserId}
                onSelectUser={handleSelectUser}
                currentUserId={currentUser.id}
              />
            </div>

            {/* Wishlist Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isOwner ? 'Мой вишлист' : `Вишлист: ${selectedMember.name}`}
                  </h1>
                  {!isOwner && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      🔒 Анти-спойлер активен
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {isOwner
                    ? 'Добавляйте желания — близкие увидят их и смогут тайно забронировать'
                    : `Забронируйте подарок, чтобы никто не купил дубликат. ${selectedMember.name} не узнает!`}
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Добавить подарок</span>
                </button>
              )}
            </div>

            {/* Event Filter & Stats */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                {events.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedEvent(tag)}
                    className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedEvent === tag
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-medium shrink-0 pl-3">
                {filteredWishes.length} {filteredWishes.length === 1 ? 'желание' : 'желаний'}
                {!isOwner && reservedWishes > 0 && ` • 🎁 ${reservedWishes} забронировано`}
              </div>
            </div>

            {/* Wishes Grid */}
            {filteredWishes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="bg-white border border-slate-200/80 rounded-3xl p-14 text-center shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <Gift className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Пока пусто</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
                  {isOwner
                    ? 'Добавьте первое желание — просто вставьте ссылку на Ozon или WB, и карточка заполнится сама'
                    : `${selectedMember.name} пока не добавил(а) ни одного подарка`}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
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
