'use client';

import React from 'react';
import { User, FamilyGroup } from '@/types';
import { getInitials, getAvatarStyle } from '@/lib/avatar';
import {
  Gift,
  Users,
  BookmarkCheck,
  Plus,
  LogOut,
  ChevronDown,
  Share2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  userGroups: FamilyGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  familyMembers: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  selectedView: 'wishes' | 'my_reservations';
  onSelectView: (view: 'wishes' | 'my_reservations') => void;
  selectedEvent: string;
  onSelectEvent: (event: string) => void;
  myReservationsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenGroupsModal: () => void;
  onLogout: () => void;
}

const EVENTS = ['Все', 'День рождения', 'Новый год', 'Без повода'];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  userGroups,
  selectedGroupId,
  onSelectGroup,
  familyMembers,
  selectedUserId,
  onSelectUser,
  selectedView,
  onSelectView,
  selectedEvent,
  onSelectEvent,
  myReservationsCount,
  isOpenMobile,
  onCloseMobile,
  onOpenGroupsModal,
  onLogout,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const activeGroup = userGroups.find((g) => g.id === selectedGroupId);

  const handleShare = () => {
    if (!activeGroup) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname =
      typeof window !== 'undefined'
        ? window.location.pathname.replace(/\/$/, '')
        : '';
    const shareUrl = `${origin}${pathname}/?code=${encodeURIComponent(
      activeGroup.invite_code
    )}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const content = (
    <div className="h-full flex flex-col justify-between p-4 select-none">
      <div className="space-y-6">
        {/* Workspace Brand + Circle Switcher */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 stroke-[1.75]" />
              </div>
              <span className="font-semibold text-xs tracking-tight text-stone-900 uppercase font-mono">
                Wishlist
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isOpenMobile && (
                <button
                  onClick={onCloseMobile}
                  className="p-1 text-stone-400 hover:text-stone-900 rounded-md md:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Group selector box */}
          {activeGroup ? (
            <div className="p-2.5 rounded-xl bg-stone-100/90 border border-stone-200/70 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  Активный круг
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-700 bg-white px-1.5 py-0.2 rounded border border-stone-200">
                  {activeGroup.invite_code}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="font-medium text-stone-900 truncate">
                  {activeGroup.name}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleShare}
                    title="Скопировать ссылку для родных"
                    className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 transition-colors"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-stone-900 stroke-[2.5]" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={onOpenGroupsModal}
                    title="Все круги"
                    className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenGroupsModal}
              className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span>Создать семью</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section 1: Views */}
        <div>
          <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
            Списки
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => {
                onSelectView('wishes');
                if (isOpenMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedView === 'wishes'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Желания семьи</span>
              </div>
            </button>

            <button
              onClick={() => {
                onSelectView('my_reservations');
                if (isOpenMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedView === 'my_reservations'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Я подарю</span>
              </div>
              {myReservationsCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedView === 'my_reservations'
                      ? 'bg-stone-800 text-stone-300'
                      : 'bg-stone-200/80 text-stone-700'
                  }`}
                >
                  {myReservationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Family Members (when in wishes view) */}
        {selectedView === 'wishes' && (
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Родственники ({familyMembers.length})
              </span>
              <button
                onClick={onOpenGroupsModal}
                title="Управление составом семьи"
                className="text-[11px] text-stone-400 hover:text-stone-900"
              >
                + Код
              </button>
            </div>

            <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-none -mx-1 px-1">
              {familyMembers.map((member) => {
                const isSelected = member.id === selectedUserId;
                const isMe = member.id === currentUser.id;
                const avatarStyle = getAvatarStyle(member.name);
                const initials = getInitials(member.name);

                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      onSelectUser(member.id);
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100/90'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0 ${
                          isSelected
                            ? 'bg-stone-800 text-stone-200 border border-stone-700'
                            : `border ${avatarStyle}`
                        }`}
                      >
                        {initials}
                      </div>
                      <span className="truncate">{member.name}</span>
                    </div>

                    {isMe && (
                      <span
                        className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded shrink-0 ${
                          isSelected
                            ? 'bg-stone-800 text-stone-300'
                            : 'bg-stone-200/70 text-stone-500'
                        }`}
                      >
                        вы
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Event Filters */}
        {selectedView === 'wishes' && (
          <div>
            <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Повод
            </div>
            <div className="flex flex-wrap gap-1">
              {EVENTS.map((event) => {
                const isActive = selectedEvent === event;
                return (
                  <button
                    key={event}
                    onClick={() => onSelectEvent(event)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-600'
                    }`}
                  >
                    {event}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer: User profile */}
      <div className="pt-4 border-t border-stone-200/80 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div
              className={`w-7 h-7 rounded-full border ${getAvatarStyle(
                currentUser.name
              )} flex items-center justify-center text-[10px] font-mono font-bold`}
            >
              {getInitials(currentUser.name)}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-stone-900 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-stone-400 truncate">
                семейный аккаунт
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Выйти"
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-stone-200/90 shrink-0 h-screen sticky top-0 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
