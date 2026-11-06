'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { getInitials } from '@/lib/avatar';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import dynamic from 'next/dynamic';
import { Button } from '@heroui/react';
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

  // User Profile Dropdown Menu
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

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
    setIsUserMenuOpen(false);
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
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Сетка"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Список"
              >
                <ListIcon className="w-4 h-4" />
              </button>
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

            {/* User Profile Avatar & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-indigo-500/20 hover:ring-indigo-500/40 transition-all cursor-pointer"
                title="Меню профиля"
              >
                {getInitials(currentUser.name)}
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-stone-400 truncate">
                      {currentUser.email || 'Вход по коду семьи'}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('reservations');
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bookmark className="w-4 h-4 text-stone-400" />
                        <span>Мои брони</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {myReservations.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsFamilyModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-stone-400" />
                      <span>Управление семьями</span>
                    </button>
                  </div>

                  <div className="border-t border-stone-100 dark:border-stone-800 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Family Members Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {familyMembers.map((member) => {
            const isSelected = effectiveTargetUserId === member.id && activeTab === 'wishes';
            const isMe = member.id === currentUser.id;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSwitchUser(member.id)}
                className={`taste-btn flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {getInitials(member.name)}
                </div>
                <span>{isMe ? `${member.name} (Я)` : member.name}</span>
              </button>
            );
          })}

          {/* Tab: My Reservations */}
          <button
            type="button"
            onClick={() => setActiveTab('reservations')}
            className={`taste-btn flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
              activeTab === 'reservations'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-stone-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Мои брони</span>
            {myReservations.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  activeTab === 'reservations'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                }`}
              >
                {myReservations.length}
              </span>
            )}
          </button>
        </div>

        {/* Bento Hero Header */}
        <div className="taste-card p-5 sm:p-6 rounded-[22px] bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs shrink-0">
              {activeTab === 'reservations' ? '🎁' : getInitials(targetMember?.name || currentUser.name)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {activeTab === 'reservations'
                    ? 'Подарки, которые вы дарите'
                    : isOwner
                    ? `${currentUser.name} (Мой список)`
                    : `Список желаний: ${targetMember?.name}`}
                </h1>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-white/[0.06]">
                  {activeTab === 'reservations'
                    ? `${displayedWishes.length} забронировано`
                    : `${displayedWishes.length} ${
                        displayedWishes.length === 1
                          ? 'желание'
                          : displayedWishes.length >= 2 && displayedWishes.length <= 4
                          ? 'желания'
                          : 'желаний'
                      }`}
                </span>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
                {activeTab === 'reservations'
                  ? 'Список забронированных вами подарков для близких. Другие участники видят отметку о бронировании.'
                  : isOwner
                  ? 'Добавляйте любые желанные подарки со ссылками на маркетплейсы, чтобы близким было легко порадовать вас.'
                  : 'Секретная бронь: нажмите «Подарю я!», чтобы застолбить подарок. Другие родственники увидят, что подарок занят.'}
              </p>
            </div>
          </div>

          {/* Add Wish button for owner */}
          {isOwner && activeTab === 'wishes' && (
            <Button
              type="button"
              size="md"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all gap-2 px-5 py-2.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить подарок</span>
            </Button>
          )}
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
