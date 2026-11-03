'use client';

import React, { useState, useEffect } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { getStoredTheme, applyTheme, Theme } from '@/lib/theme';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import { InlineAddWish } from '@/components/InlineAddWish';
import { AddWishModal } from '@/components/AddWishModal';
import { FamilyGroupModal } from '@/components/FamilyGroupModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { AuthScreen } from '@/components/AuthScreen';
import { formatPrice } from '@/lib/utils';
import { getAvatarStyle, getInitials } from '@/lib/avatar';
import {
  Gift,
  Plus,
  LayoutGrid,
  List,
  Lock,
  Search,
  BookmarkCheck,
  X,
  ChevronDown,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedView, setSelectedView] = useState<'wishes' | 'my_reservations'>('wishes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  type DisplayWish = Wish & {
    is_reserved?: boolean;
    reserved_by_me?: boolean;
    owner_name?: string;
  };

  const [wishes, setWishes] = useState<DisplayWish[]>([]);
  const [myReservations, setMyReservations] = useState<DisplayWish[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    const t = getStoredTheme();
    setCurrentTheme(t);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Check onboarding on user change
  const checkOnboarding = () => {
    try {
      const seen = localStorage.getItem('wishlist_onboarding_done');
      if (!seen) {
        setIsOnboardingOpen(true);
      }
    } catch {
      /* noop */
    }
  };

  // Initialize data on mount
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
      setIsAppLoading(false);
      checkOnboarding();
    }

    const init = async () => {
      try {
        const user = await dataStore.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          await loadUserData(user.id);
          checkOnboarding();
        } else {
          setCurrentUser(null);
          setUserGroups([]);
          setFamilyMembers([]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
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
      if (
        selectedGroupId &&
        (groups.some((g) => g.id === selectedGroupId) || selectedGroupId === 'all')
      ) {
        activeGroupId = selectedGroupId;
      } else {
        activeGroupId = groups[0]?.id || 'all';
      }
    }
    setSelectedGroupId(activeGroupId);

    const members = await dataStore.getFamilyMembers(userId, activeGroupId);
    setFamilyMembers(members);
    dataStore.setCachedMembers(members);

    const activeTargetId =
      selectedUserId && members.some((m) => m.id === selectedUserId)
        ? selectedUserId
        : userId;

    setSelectedUserId(activeTargetId);
    await Promise.all([
      loadWishes(activeTargetId, userId),
      loadMyReservations(userId),
    ]);
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

  const loadWishes = async (targetId: string, viewerId: string) => {
    const list = await dataStore.getWishesForUser(targetId, viewerId);
    setWishes(list);
  };

  const loadMyReservations = async (userId: string) => {
    const reserved = await dataStore.getMyReservations(userId);
    setMyReservations(reserved);
  };

  const handleSelectUser = async (id: string) => {
    setSelectedUserId(id);
    setSelectedView('wishes');
    if (currentUser) {
      await loadWishes(id, currentUser.id);
    }
  };

  const handleAuth = async (user: User) => {
    setCurrentUser(user);
    await loadUserData(user.id);
    checkOnboarding();
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

  // Optimistic toggle reservation for instant 0ms feedback
  const handleToggleReserve = async (wishId: string) => {
    if (!currentUser) return;

    // Optimistically update wishes state
    setWishes((prev) =>
      prev.map((w) => {
        if (w.id === wishId) {
          const nextReserved = !w.is_reserved;
          return {
            ...w,
            is_reserved: nextReserved,
            reserved_by_me: nextReserved,
          };
        }
        return w;
      })
    );

    // Optimistically update myReservations state
    setMyReservations((prev) => {
      const exists = prev.some((w) => w.id === wishId);
      if (exists) {
        return prev.filter((w) => w.id !== wishId);
      }
      const item = wishes.find((w) => w.id === wishId);
      if (item) {
        return [{ ...item, is_reserved: true, reserved_by_me: true }, ...prev];
      }
      return prev;
    });

    try {
      await dataStore.toggleReservation(wishId, currentUser.id);
    } catch (err) {
      console.error('Reservation error:', err);
      // Revert if error
      await Promise.all([
        loadWishes(selectedUserId, currentUser.id),
        loadMyReservations(currentUser.id),
      ]);
    }
  };

  // Optimistic delete wish for instant 0ms removal
  const handleDeleteWish = async (wishId: string) => {
    if (!currentUser) return;
    if (!confirm('Удалить это желание?')) return;

    // Optimistic UI update
    setWishes((prev) => prev.filter((w) => w.id !== wishId));
    setMyReservations((prev) => prev.filter((w) => w.id !== wishId));

    try {
      await dataStore.deleteWish(wishId, currentUser.id);
    } catch (err) {
      console.error('Delete wish error:', err);
      await Promise.all([
        loadWishes(selectedUserId, currentUser.id),
        loadMyReservations(currentUser.id),
      ]);
    }
  };

  // Optimistic instant add wish (0ms appearance even with photo!)
  const handleAddWish = async (wishData: Omit<Wish, 'id' | 'created_at'>) => {
    if (!currentUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticWish: DisplayWish = {
      ...wishData,
      id: tempId,
      created_at: new Date().toISOString(),
    };

    // INSTANT UI ADDITION (Zero delay)
    if (selectedUserId === currentUser.id) {
      setWishes((prev) => [optimisticWish, ...prev]);
    }

    try {
      const created = await dataStore.addWish(wishData);
      if (created) {
        setWishes((prev) =>
          prev.map((w) => (w.id === tempId ? { ...created, is_reserved: false } : w))
        );
      }
    } catch (err) {
      console.error('Add wish error:', err);
    }
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 flex items-center justify-center mb-3 animate-pulse">
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
  const selectedMember =
    familyMembers.find((m) => m.id === selectedUserId) || currentUser;
  const isOwner = currentUser.id === selectedMember.id;

  // Filter wishes (search only — occasion removed per request)
  const visibleWishes = (
    selectedView === 'wishes' ? wishes : myReservations
  ).filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.title.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q)
    );
  });

  const totalReservedBudget = myReservations.reduce(
    (acc, w) => acc + (w.price || 0),
    0
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex text-stone-900 dark:text-stone-100 antialiased transition-colors duration-200">
      {/* Permanent Left Sidebar (desktop) + Slide-over Drawer (mobile) */}
      <Sidebar
        currentUser={currentUser}
        userGroups={userGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSwitchGroup}
        familyMembers={familyMembers}
        selectedUserId={selectedUserId}
        onSelectUser={handleSelectUser}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        myReservationsCount={myReservations.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenGroupsModal={() => setIsGroupsOpen(true)}
        onLogout={handleLogout}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Main Focus Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* iOS-Style Minimalist Top Bar */}
        <header className="sticky top-0 z-20 bg-stone-50/85 dark:bg-stone-950/85 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-800/80 px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Circle Trigger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-900 dark:text-stone-100 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="truncate max-w-[130px]">
                {activeGroup?.name || 'Моя семья'}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
            </button>

            {/* Desktop breadcrumb */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 min-w-0 truncate font-mono">
              <span className="truncate">{activeGroup?.name || 'Круг'}</span>
              <span>/</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {selectedView === 'wishes'
                  ? isOwner
                    ? 'Мой вишлист'
                    : selectedMember.name
                  : 'Я подарю'}
              </span>
            </div>
          </div>

          {/* Right Top Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle Button (Mobile & Desktop) */}
            <button
              onClick={handleToggleTheme}
              title={currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-all cursor-pointer active:scale-90"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300 transition-transform -rotate-12 hover:rotate-0" />
              )}
            </button>

            {/* Help / Onboarding Button */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              title="Обучение"
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-all cursor-pointer active:scale-90 hidden sm:inline-flex"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Mobile search toggle */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 sm:hidden cursor-pointer active:scale-90 transition-all"
              title="Поиск"
            >
              {isMobileSearchOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>

            {/* Desktop Search */}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-100 w-32 md:w-44 transition-all"
              />
            </div>

            {/* View Mode Switcher: Desktop only */}
            <div className="hidden sm:flex items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                title="Сетка"
                className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-90 ${
                  viewMode === 'grid'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Компактный список"
                className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-90 ${
                  viewMode === 'list'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct Add Wish button (Desktop) */}
            {isOwner && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
                <span>Желание</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Search input dropdown */}
        {isMobileSearchOpen && (
          <div className="p-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sm:hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по желаниям..."
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-3.5 py-2 text-base text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-100"
              />
            </div>
          </div>
        )}

        {/* Canvas Body with smooth transition when changing views or members */}
        <main
          key={`${selectedView}_${selectedUserId}`}
          className="max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 md:pb-8 space-y-4 sm:space-y-6 animate-in fade-in duration-200 slide-in-from-bottom-1"
        >
          {selectedView === 'wishes' ? (
            <>
              {/* Native iOS-Style Large Header */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between pt-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 dark:text-stone-50 tracking-tight">
                    {isOwner ? 'Мой вишлист' : selectedMember.name}
                  </h1>

                  <span className="text-xs font-mono text-stone-400 dark:text-stone-500">
                    {visibleWishes.length}{' '}
                    {visibleWishes.length === 1 ? 'желание' : 'желаний'}
                  </span>
                </div>

                {/* Mobile Relatives Pill Selector */}
                {familyMembers.length > 1 && (
                  <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
                    {familyMembers.map((member) => {
                      const isSelected = member.id === selectedUserId;
                      const isMe = member.id === currentUser.id;
                      const avatarStyle = getAvatarStyle(member.name);
                      const initials = getInitials(member.name);

                      return (
                        <button
                          key={member.id}
                          onClick={() => handleSelectUser(member.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 active:bg-stone-100 dark:active:bg-stone-800'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-bold ${
                              isSelected
                                ? 'bg-stone-800 dark:bg-stone-200 text-stone-200 dark:text-stone-800'
                                : `border ${avatarStyle}`
                            }`}
                          >
                            {initials}
                          </div>
                          <span>{isMe ? 'Вы' : member.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Subtle Anti-spoiler Note */}
                {!isOwner && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 bg-stone-100/80 dark:bg-stone-800/80 rounded-xl px-3 py-2 border border-stone-200/60 dark:border-stone-700/60">
                    <Lock className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 shrink-0" />
                    <span>
                      Анти-спойлер: {selectedMember.name} не видит ваши брони
                    </span>
                  </div>
                )}
              </div>

              {/* Inline Quick Add (for owner) */}
              {isOwner && (
                <InlineAddWish
                  currentUserId={currentUser.id}
                  onAddWish={handleAddWish}
                  onOpenFullModal={() => setIsAddOpen(true)}
                />
              )}

              {/* Wishes presentation: On mobile, always show clean native Inset Grouped Table! */}
              {visibleWishes.length > 0 ? (
                <>
                  {/* Mobile: Inset Grouped List View */}
                  <div className="sm:hidden bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-xs">
                    {visibleWishes.map((wish) => (
                      <WishRow
                        key={wish.id}
                        wish={wish}
                        isOwner={isOwner}
                        onToggleReserve={handleToggleReserve}
                        onDeleteWish={handleDeleteWish}
                      />
                    ))}
                  </div>

                  {/* Desktop: Grid or List depending on user choice */}
                  <div className="hidden sm:block">
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                        {visibleWishes.map((wish) => (
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
                      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-2xs">
                        {visibleWishes.map((wish) => (
                          <WishRow
                            key={wish.id}
                            wish={wish}
                            isOwner={isOwner}
                            onToggleReserve={handleToggleReserve}
                            onDeleteWish={handleDeleteWish}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center mx-auto mb-2.5">
                    <Gift className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-1">
                    Желания не найдены
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
                    {isOwner
                      ? 'Вставьте ссылку на товар или нажмите кнопку ниже.'
                      : `${selectedMember.name} пока не добавил(а) подарков.`}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="px-4 py-2.5 rounded-full bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      + Добавить первое желание
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Dedicated "Я подарю" (My Reservations) View */
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 dark:text-stone-50 tracking-tight flex items-center gap-2">
                    <BookmarkCheck className="w-6 h-6 stroke-[2]" />
                    <span>Я подарю</span>
                  </h1>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Секретный список подарков, которые вы пообещали подарить.
                  </p>
                </div>

                {myReservations.length > 0 && totalReservedBudget > 0 && (
                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left sm:text-right shrink-0 shadow-xs">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      Сумма подарков
                    </div>
                    <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                      {formatPrice(totalReservedBudget, '₽')}
                    </div>
                  </div>
                )}
              </div>

              {visibleWishes.length > 0 ? (
                <>
                  {/* Mobile Grouped Inset List */}
                  <div className="sm:hidden bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-xs">
                    {visibleWishes.map((wish) => (
                      <div key={wish.id} className="relative">
                        <div className="px-3.5 pt-2 text-[10px] font-mono text-stone-400 dark:text-stone-500">
                          Для кого: {wish.owner_name}
                        </div>
                        <WishRow
                          wish={wish}
                          isOwner={false}
                          onToggleReserve={handleToggleReserve}
                          onDeleteWish={() => {}}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Desktop view */}
                  <div className="hidden sm:block">
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                        {visibleWishes.map((wish) => (
                          <div key={wish.id} className="flex flex-col gap-1.5">
                            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 px-1">
                              Для:{' '}
                              <span className="font-semibold text-stone-900 dark:text-stone-100">
                                {wish.owner_name}
                              </span>
                            </div>
                            <WishCard
                              wish={wish}
                              isOwner={false}
                              onToggleReserve={handleToggleReserve}
                              onDeleteWish={() => {}}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-2xs">
                        {visibleWishes.map((wish) => (
                          <div key={wish.id} className="relative">
                            <div className="px-4 pt-2 text-[10px] font-mono text-stone-400 dark:text-stone-500">
                              Для кого: {wish.owner_name}
                            </div>
                            <WishRow
                              wish={wish}
                              isOwner={false}
                              onToggleReserve={handleToggleReserve}
                              onDeleteWish={() => {}}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center mx-auto mb-2.5">
                    <BookmarkCheck className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-1">
                    Вы пока ничего не забронировали
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
                    Перейдите в вишлист родственника и нажмите «Подарю я».
                  </p>
                  <button
                    onClick={() => setSelectedView('wishes')}
                    className="px-4 py-2.5 rounded-full bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Перейти к желаниям семьи
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <MobileNav
        selectedView={selectedView}
        onSelectView={setSelectedView}
        myReservationsCount={myReservations.length}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenAddWish={() => setIsAddOpen(true)}
      />

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

      {/* Interactive Onboarding Tour Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
