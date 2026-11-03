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
import { Gift, PlusCircle, Users } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [wishes, setWishes] = useState<
    (Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('Все');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Инициализация при монтировании
  useEffect(() => {
    setMounted(true);
    checkSession();
  }, []);

  const checkSession = async () => {
    const user = await dataStore.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await loadUserData(user.id);
    }
  };

  const loadUserData = async (userId: string) => {
    const [groups, members] = await Promise.all([
      dataStore.getUserGroups(userId),
      dataStore.getFamilyMembers(userId),
    ]);

    setUserGroups(groups);
    setFamilyMembers(members);

    const activeTargetId = selectedUserId && members.some((m) => m.id === selectedUserId)
      ? selectedUserId
      : userId;

    setSelectedUserId(activeTargetId);
    await loadWishes(activeTargetId, userId);
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-warm-400 text-xs font-medium">Загрузка...</div>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onSuccess={handleAuth} />;

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
        {/* Onboarding — нет семей */}
        {userGroups.length === 0 ? (
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
            {/* Family bar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-warm-400 uppercase tracking-wider">
                  Семья
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
        onClose={() => setIsGroupsOpen(false)}
        onUpdate={handleGroupsUpdated}
      />
    </div>
  );
}
