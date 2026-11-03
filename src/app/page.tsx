'use client';

import React, { useState, useEffect } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { Sidebar } from '@/components/Sidebar';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import { InlineAddWish } from '@/components/InlineAddWish';
import { AddWishModal } from '@/components/AddWishModal';
import { FamilyGroupModal } from '@/components/FamilyGroupModal';
import { AuthScreen } from '@/components/AuthScreen';
import { formatPrice } from '@/lib/utils';
import {
  Gift,
  Plus,
  LayoutGrid,
  List,
  Menu,
  Lock,
  Search,
  BookmarkCheck,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedView, setSelectedView] = useState<'wishes' | 'my_reservations'>(
    'wishes'
  );
  const [selectedEvent, setSelectedEvent] = useState('Все');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    await Promise.all([
      loadWishes(selectedUserId, currentUser.id),
      loadMyReservations(currentUser.id),
    ]);
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!currentUser) return;
    if (confirm('Удалить это желание?')) {
      await dataStore.deleteWish(wishId, currentUser.id);
      await Promise.all([
        loadWishes(selectedUserId, currentUser.id),
        loadMyReservations(currentUser.id),
      ]);
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
        <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center mb-3">
          <Gift className="w-4 h-4 stroke-[1.75]" />
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

  // Filter wishes
  const visibleWishes = (
    selectedView === 'wishes' ? wishes : myReservations
  ).filter((w) => {
    if (selectedView === 'wishes') {
      const matchEvent =
        selectedEvent === 'Все' || w.event_tag === selectedEvent;
      const matchSearch =
        !searchQuery.trim() ||
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEvent && matchSearch;
    } else {
      const matchSearch =
        !searchQuery.trim() ||
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    }
  });

  const totalReservedBudget = myReservations.reduce(
    (acc, w) => acc + (w.price || 0),
    0
  );

  return (
    <div className="min-h-screen bg-stone-50 flex text-stone-900 antialiased">
      {/* Permanent Left Sidebar (desktop) + Drawer (mobile) */}
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
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
        myReservationsCount={myReservations.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenGroupsModal={() => setIsGroupsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Focus Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Sticky Minimalist Top Bar */}
        <header className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 text-stone-600 hover:text-stone-900 md:hidden rounded-lg hover:bg-stone-200/60"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500 min-w-0 truncate font-mono">
              <span className="truncate">{activeGroup?.name || 'Круг'}</span>
              <span>/</span>
              <span className="font-semibold text-stone-900 truncate">
                {selectedView === 'wishes'
                  ? isOwner
                    ? 'Мой вишлист'
                    : selectedMember.name
                  : 'Я подарю'}
              </span>
            </div>
          </div>

          {/* Right Top Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="bg-white border border-stone-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:border-stone-900 w-32 md:w-44 transition-all"
              />
            </div>

            {/* View Mode Switcher: Grid vs List */}
            <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="Сетка"
                className={`p-1 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-400 hover:text-stone-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Компактный список"
                className={`p-1 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-400 hover:text-stone-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct Add Wish button */}
            {isOwner && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
                <span className="hidden sm:inline">Желание</span>
              </button>
            )}
          </div>
        </header>

        {/* Canvas Body */}
        <main className="max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
          {selectedView === 'wishes' ? (
            <>
              {/* Member Title & Status Banner */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
                      {isOwner ? 'Мой список желаний' : selectedMember.name}
                    </h1>

                    {!isOwner && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
                        <Lock className="w-2.5 h-2.5 stroke-[2]" />
                        Анти-спойлер
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono text-stone-400">
                    {visibleWishes.length}{' '}
                    {visibleWishes.length === 1 ? 'желание' : 'желаний'}
                  </div>
                </div>

                {!isOwner && (
                  <div className="p-3 rounded-xl bg-stone-100/70 border border-stone-200/80 text-xs text-stone-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>
                      Бронируйте подарки для {selectedMember.name}. Именинник
                      не увидит бронь, а другие родственники поймут, что подарок
                      уже занят.
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

              {/* Wishes presentation (Grid or List) */}
              {visibleWishes.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden shadow-2xs">
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
                )
              ) : (
                <div className="bg-white border border-stone-200/90 rounded-2xl p-10 sm:p-14 text-center">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-medium text-stone-900 text-sm mb-1">
                    Желания не найдены
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
                    {isOwner
                      ? 'Вставьте ссылку на товар в поле выше или нажмите кнопку, чтобы добавить подарок.'
                      : `${selectedMember.name} пока не добавил(а) подарков в эту категорию.`}
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
          ) : (
            /* Dedicated "Я подарю" (My Reservations) View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight flex items-center gap-2">
                    <BookmarkCheck className="w-6 h-6 stroke-[1.75]" />
                    <span>Я подарю (Мои брони)</span>
                  </h1>
                  <p className="text-xs text-stone-500 mt-1">
                    Секретный список подарков, которые вы пообещали подарить
                    членам семьи.
                  </p>
                </div>

                {myReservations.length > 0 && totalReservedBudget > 0 && (
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-right shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      Примерный бюджет
                    </div>
                    <div className="text-sm font-bold font-mono text-stone-900">
                      {formatPrice(totalReservedBudget, '₽')}
                    </div>
                  </div>
                )}
              </div>

              {visibleWishes.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleWishes.map((wish) => (
                      <div key={wish.id} className="flex flex-col gap-1.5">
                        <div className="text-[11px] font-mono text-stone-500 px-1">
                          Для:{' '}
                          <span className="font-semibold text-stone-900">
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
                  <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden shadow-2xs">
                    {visibleWishes.map((wish) => (
                      <div key={wish.id} className="relative">
                        <div className="px-4 pt-2 text-[10px] font-mono text-stone-400">
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
                )
              ) : (
                <div className="bg-white border border-stone-200/90 rounded-2xl p-10 sm:p-14 text-center">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <BookmarkCheck className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-medium text-stone-900 text-sm mb-1">
                    Вы пока ничего не забронировали
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
                    Перейдите в вишлист любого родственника в боковом меню и
                    нажмите «Подарю я», чтобы забронировать подарок.
                  </p>
                  <button
                    onClick={() => setSelectedView('wishes')}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer"
                  >
                    Перейти к желаниям семьи
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

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
