'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { getInitials } from '@/lib/avatar';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import dynamic from 'next/dynamic';
import { Button, Tabs, Chip, Card, Avatar, AvatarFallback, Dropdown, DropdownTrigger, DropdownPopover, DropdownMenu, DropdownItem } from '@heroui/react';
import {
  Gift,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Sun,
  Moon,
  Bookmark,
  Users,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Sparkles,
} from 'lucide-react';

const AddWishModal = dynamic(
  () => import('@/components/AddWishModal').then((m) => m.AddWishModal),
  { ssr: false }
);

const FamilyGroupModal = dynamic(
  () => import('@/components/FamilyGroupModal').then((m) => m.FamilyGroupModal),
  { ssr: false }
);
import { AuthScreen } from '@/components/AuthScreen';

export default function HomePage() {
  const { mode, toggleColorMode } = useColorMode();

  // Authentication & Groups
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // View state
  const [activeTab, setActiveTab] = useState<'wishes' | 'reservations'>('wishes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Wishes data
  const [wishes, setWishes] = useState<(Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]>([]);
  const [myReservations, setMyReservations] = useState<(Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWishesLoaded, setIsWishesLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  // Notifications
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = useCallback((message: string, severity: 'success' | 'info' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Auto-dismiss notification after 3.5s
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  // Keep a ref to currentUser for async callbacks without triggering re-renders
  const currentUserRef = useRef<User | null>(null);
  currentUserRef.current = currentUser;

  // Load wishes: first show local cache instantly, then sync remote in background
  const fetchWishes = useCallback(async (targetId: string, viewerId: string) => {
    // 1. Instant local render (0ms)
    const local = dataStore.getLocalWishes(targetId, viewerId);
    if (local.length > 0) {
      setWishes(local);
      setIsWishesLoaded(true);
    }

    // 2. Background remote sync
    setIsRefreshing(true);
    try {
      const items = await dataStore.getWishesForUser(targetId, viewerId);
      setWishes(items);
    } catch (err) {
      console.error('Error fetching wishes:', err);
    } finally {
      setIsRefreshing(false);
      setIsWishesLoaded(true);
    }
  }, []);

  // Load reservations
  const fetchReservations = useCallback(async (viewerId: string) => {
    try {
      const items = await dataStore.getMyReservations(viewerId);
      setMyReservations(items);
    } catch (err) {
      console.error('Error loading reservations:', err);
    }
  }, []);

  // Complete user and family data loader (parallelized without waterfalls)
  const loadInitialData = useCallback(async (user: User) => {
    setSelectedUserId(user.id);

    try {
      const reservationsPromise = fetchReservations(user.id);
      const groups = await dataStore.getUserGroups(user.id);
      setUserGroups(groups);

      const activeGroup = groups[0];
      const activeGroupId = activeGroup?.id || 'all';
      setSelectedGroupId(activeGroupId);

      const members = await dataStore.getFamilyMembers(user.id, activeGroupId);
      setFamilyMembers(members);

      await Promise.all([
        fetchWishes(user.id, user.id),
        reservationsPromise,
      ]);
    } catch (err) {
      console.error('Initial data load error:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchWishes, fetchReservations]);

  // Run ONCE on mount
  useEffect(() => {
    const cachedUser = dataStore.getCachedUser();
    if (cachedUser) {
      setCurrentUser(cachedUser);
      setSelectedUserId(cachedUser.id);
      const cachedGroups = dataStore.getCachedGroups();
      if (cachedGroups && cachedGroups.length > 0) {
        setUserGroups(cachedGroups);
        setSelectedGroupId(cachedGroups[0].id);
      }
      const cachedMembers = dataStore.getCachedMembers();
      if (cachedMembers && cachedMembers.length > 0) {
        setFamilyMembers(cachedMembers);
      }
      const cachedWishes = dataStore.getLocalWishes(cachedUser.id, cachedUser.id);
      if (cachedWishes.length > 0) {
        setWishes(cachedWishes);
        setIsWishesLoaded(true);
      }
      setIsInitialLoading(false);
    }

    // Remote sync
    (async () => {
      try {
        const user = await dataStore.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setSelectedUserId(user.id);
          await loadInitialData(user);
        } else {
          setCurrentUser(null);
          setIsInitialLoading(false);
        }
      } catch (err) {
        console.error('Mount init error:', err);
        setIsInitialLoading(false);
      }
    })();
  }, [loadInitialData]);

  // Smooth switch target user: zero twitching, instant local cache, stable scroll
  const handleSwitchUser = useCallback(async (targetId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    setSelectedUserId(targetId);
    setActiveTab('wishes');

    await fetchWishes(targetId, user.id);
  }, [fetchWishes]);

  // Smooth switch family group
  const handleSwitchGroup = useCallback(async (groupId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    setSelectedGroupId(groupId);
    setIsRefreshing(true);

    try {
      const members = await dataStore.getFamilyMembers(user.id, groupId);
      setFamilyMembers(members);

      const nextTargetId = members.some((m) => m.id === user.id)
        ? user.id
        : members[0]?.id || user.id;

      setSelectedUserId(nextTargetId);
      await fetchWishes(nextTargetId, user.id);
    } catch (err) {
      console.error('Error switching group:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchWishes]);

  // Add wish
  const handleAddWish = useCallback(async (wishData: Omit<Wish, 'id' | 'created_at'>) => {
    const user = currentUserRef.current;
    if (!user) return;

    const newWish = await dataStore.addWish(wishData);
    if (newWish) {
      if (selectedUserId === user.id) {
        setWishes((prev) => [
          { ...newWish, is_reserved: false, reserved_by_me: false },
          ...prev,
        ]);
      }
      showNotification('Подарок успешно добавлен в список!');
    }
  }, [selectedUserId, showNotification]);

  // Toggle reserve
  const handleToggleReserve = useCallback(async (wishId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    const wish = wishes.find((w) => w.id === wishId);
    const wasReservedByMe = wish?.reserved_by_me;

    // Optimistic instant update
    setWishes((prev) =>
      prev.map((w) => {
        if (w.id === wishId) {
          const nextReserved = !w.reserved_by_me;
          return {
            ...w,
            is_reserved: nextReserved,
            reserved_by_me: nextReserved,
          };
        }
        return w;
      })
    );

    try {
      await dataStore.toggleReservation(wishId, user.id);
      await fetchReservations(user.id);
      showNotification(
        wasReservedByMe
          ? 'Бронь снята'
          : 'Подарок забронирован! Именинник об этом не узнает 😉'
      );
    } catch {
      showNotification('Не удалось обновить статус брони', 'error');
      await fetchWishes(selectedUserId, user.id);
    }
  }, [wishes, fetchReservations, fetchWishes, selectedUserId, showNotification]);

  // Delete wish
  const handleDeleteWish = useCallback(async (wishId: string) => {
    const user = currentUserRef.current;
    if (!user) return;
    if (!confirm('Вы уверены, что хотите удалить этот подарок?')) return;

    setWishes((prev) => prev.filter((w) => w.id !== wishId));

    try {
      await dataStore.deleteWish(wishId, user.id);
      showNotification('Подарок удален из списка');
    } catch {
      showNotification('Ошибка при удалении', 'error');
      await fetchWishes(selectedUserId, user.id);
    }
  }, [fetchWishes, selectedUserId, showNotification]);

  // Logout
  const handleLogout = async () => {
    await dataStore.logout();
    setCurrentUser(null);
    setUserGroups([]);
    setFamilyMembers([]);
    setWishes([]);
    setMyReservations([]);
  };

  // Wishes for active tab
  const displayedWishes = useMemo(() => {
    return activeTab === 'reservations' ? myReservations : wishes;
  }, [activeTab, wishes, myReservations]);

  // User is owner if selectedUserId is empty or explicitly matches currentUser.id
  const isOwner = Boolean(
    currentUser &&
    (!selectedUserId || selectedUserId === currentUser.id)
  );

  const effectiveTargetUserId = isOwner
    ? (currentUser?.id || '')
    : (selectedUserId || currentUser?.id || '');

  const activeGroup = userGroups.find((g) => g.id === selectedGroupId) || userGroups[0];
  const targetMember = isOwner
    ? currentUser
    : (familyMembers.find((m) => m.id === effectiveTargetUserId) || currentUser);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-bounce">
          <Gift className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          Загрузка вишлиста...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
          loadInitialData(user);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-stone-100/70 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors"
      style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Top Navigation Bar with seamless iOS safe-area extension */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-stone-900/85 border-b border-stone-200/80 dark:border-stone-800 shadow-xs"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand & Family Selector */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Gift className="w-5 h-5" />
            </div>

            <div>
              <div className="text-base font-extrabold tracking-tight leading-tight">
                Вишлист
              </div>
              {activeGroup && (
                <button
                  type="button"
                  onClick={() => setIsFamilyModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Users className="w-3 h-3" />
                  <span>{activeGroup.name}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Add Wish button in header when viewing own wishlist */}
            {isOwner && activeTab === 'wishes' && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all gap-1.5 px-3 h-9 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить подарок</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
            )}

            {/* View Mode Toggle via HeroUI Tabs with Animated Sliding Indicator */}
            <div className="hidden sm:flex items-center">
              <Tabs
                selectedKey={viewMode}
                onSelectionChange={(key) => setViewMode(key as 'grid' | 'list')}
                className="w-auto view-mode-tabs"
              >
                <Tabs.ListContainer className="rounded-xl">
                  <Tabs.List aria-label="Режим отображения">
                    <Tabs.Tab id="grid" aria-label="Сетка">
                      <LayoutGrid className="w-4 h-4" />
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="list" aria-label="Список">
                      <ListIcon className="w-4 h-4" />
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleColorMode}
              title={mode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Avatar & Dropdown via HeroUI Dropdown */}
            <Dropdown>
              <DropdownTrigger
                className="w-9 h-9 rounded-full bg-transparent p-0 border-0 flex items-center justify-center cursor-pointer outline-none ring-2 ring-indigo-500/20 hover:ring-indigo-500/40 transition-all"
                aria-label="Меню профиля"
              >
                <Avatar className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs">
                  <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownTrigger>

              <DropdownPopover
                placement="bottom end"
                className="w-56 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden p-0"
              >
                <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-stone-400 truncate">
                    {currentUser.email || 'Вход по коду семьи'}
                  </div>
                </div>

                <DropdownMenu
                  aria-label="Меню пользователя"
                  className="p-1 outline-none space-y-0.5"
                  onAction={(key) => {
                    if (key === 'reservations') {
                      setActiveTab('reservations');
                    } else if (key === 'families') {
                      setIsFamilyModalOpen(true);
                    } else if (key === 'logout') {
                      handleLogout();
                    }
                  }}
                >
                  <DropdownItem
                    id="reservations"
                    textValue="Мои брони"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer outline-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-4 h-4 text-stone-400" />
                      <span>Мои брони</span>
                    </div>
                    <Chip className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-0">
                      {myReservations.length}
                    </Chip>
                  </DropdownItem>

                  <DropdownItem
                    id="families"
                    textValue="Управление семьями"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer outline-none"
                  >
                    <Users className="w-4 h-4 text-stone-400" />
                    <span>Управление семьями</span>
                  </DropdownItem>

                  <DropdownItem
                    id="logout"
                    textValue="Выйти"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer outline-none border-t border-stone-100 dark:border-stone-800 mt-1 pt-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Выйти</span>
                  </DropdownItem>
                </DropdownMenu>
              </DropdownPopover>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Family Members & Reservations Segmented Controller via HeroUI Tabs */}
        <div className="flex items-center overflow-x-auto pb-2 mb-6 scrollbar-none">
          <Tabs
            selectedKey={activeTab === 'reservations' ? 'reservations' : effectiveTargetUserId}
            onSelectionChange={(key) => {
              const k = String(key);
              if (k === 'reservations') {
                setActiveTab('reservations');
              } else {
                handleSwitchUser(k);
              }
            }}
            className="w-auto family-nav-tabs"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Семья и бронирования">
                {familyMembers.map((member) => {
                  const isSelected = effectiveTargetUserId === member.id && activeTab === 'wishes';
                  const isMe = member.id === currentUser.id;

                  return (
                    <Tabs.Tab
                      key={member.id}
                      id={member.id}
                      aria-label={member.name}
                    >
                      <Avatar
                        className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <AvatarFallback className="bg-transparent text-[10px] font-mono">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{isMe ? `${member.name} (Я)` : member.name}</span>

                      {/* Display count badge ONLY when this member is selected */}
                      {isSelected && isWishesLoaded && (
                        <Chip
                          className="h-4.5 min-w-4.5 px-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white transition-all animate-in fade-in zoom-in-95 duration-150"
                        >
                          {displayedWishes.length}
                        </Chip>
                      )}

                      <Tabs.Indicator />
                    </Tabs.Tab>
                  );
                })}

                <Tabs.Tab
                  id="reservations"
                  aria-label="Мои брони"
                  className="flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Мои брони</span>
                  {myReservations.length > 0 && (
                    <Chip
                      className={`h-4.5 min-w-4.5 px-1.5 rounded-full text-[10px] font-bold transition-colors ${
                        activeTab === 'reservations'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {myReservations.length}
                    </Chip>
                  )}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {/* Non-intrusive subtle background loading indicator */}
        {isRefreshing && (
          <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-indigo-600 animate-pulse w-full" />
          </div>
        )}

        {/* Wishes Content List / Grid */}
        {displayedWishes.length === 0 && (!isWishesLoaded || isRefreshing) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="p-4 rounded-[22px] bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-white/[0.08] space-y-3"
              >
                <div className="w-full h-40 rounded-xl motion-shimmer" />
                <div className="w-3/4 h-5 rounded-lg motion-shimmer" />
                <div className="w-1/2 h-4 rounded-lg motion-shimmer" />
              </div>
            ))}
          </div>
        ) : displayedWishes.length === 0 && isWishesLoaded && !isRefreshing ? (
          <div className="motion-entrance py-12 px-6 rounded-[22px] bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 text-center max-w-lg mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Gift className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {activeTab === 'reservations'
                ? 'Вы еще не выбрали подарки'
                : isOwner
                ? 'Ваш список пока пуст'
                : `${targetMember?.name || 'Родственник'} еще не составил список`}
            </h3>

            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'reservations'
                ? 'Перейдите в список любого члена семьи сверху и нажмите «Подарю я!». Забронированные подарки будут видны только вам.'
                : isOwner
                ? 'Добавьте первое желание — просто вставьте ссылку на Ozon, Wildberries, Яндекс.Маркет или напишите текстом!'
                : 'Напомните близкому человеку добавить желания, чтобы сделать идеальный сюрприз к празднику.'}
            </p>

            {isOwner && activeTab === 'wishes' && (
              <div className="pt-2">
                <Button
                  type="button"
                  size="md"
                  onClick={() => setIsAddModalOpen(true)}
                  className="taste-btn rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-2 px-5 py-2.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить первое желание</span>
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayedWishes.map((wish, index) => (
              <div
                key={wish.id}
                className="motion-entrance"
                style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
              >
                <WishCard
                  wish={wish}
                  isOwner={isOwner}
                  onToggleReserve={handleToggleReserve}
                  onDeleteWish={handleDeleteWish}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedWishes.map((wish, index) => (
              <div
                key={wish.id}
                className="motion-entrance"
                style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
              >
                <WishRow
                  wish={wish}
                  isOwner={isOwner}
                  onToggleReserve={handleToggleReserve}
                  onDeleteWish={handleDeleteWish}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Wish Modal */}
      <AddWishModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWish={handleAddWish}
        userId={currentUser.id}
      />

      {/* Family Groups Manager Modal */}
      <FamilyGroupModal
        isOpen={isFamilyModalOpen}
        currentUser={currentUser}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSwitchGroup}
        onClose={() => setIsFamilyModalOpen(false)}
        onUpdate={() => {
          if (currentUser) {
            handleSwitchGroup(selectedGroupId);
          }
        }}
      />

      {/* Global Toast Notification */}
      {snackbar.open && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md border ${
              snackbar.severity === 'error'
                ? 'bg-rose-500/95 text-white border-rose-600 shadow-rose-500/20'
                : 'bg-stone-900/95 dark:bg-stone-800/95 text-white border-stone-700/80 shadow-black/30'
            }`}
          >
            {snackbar.severity === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
            )}
            <span>{snackbar.message}</span>
            <button
              type="button"
              onClick={handleCloseSnackbar}
              className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
