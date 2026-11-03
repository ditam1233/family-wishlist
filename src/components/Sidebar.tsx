'use client';

import React from 'react';
import { User, FamilyGroup } from '@/types';
import { getInitials, getAvatarStyle } from '@/lib/avatar';
import { Theme } from '@/lib/theme';
import {
  Gift,
  Users,
  BookmarkCheck,
  LogOut,
  Share2,
  Check,
  X,
  Sun,
  Moon,
  HelpCircle,
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
  myReservationsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenGroupsModal: () => void;
  onLogout: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  onOpenOnboarding: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  userGroups,
  selectedGroupId,
  familyMembers,
  selectedUserId,
  onSelectUser,
  selectedView,
  onSelectView,
  myReservationsCount,
  isOpenMobile,
  onCloseMobile,
  onOpenGroupsModal,
  onLogout,
  currentTheme,
  onToggleTheme,
  onOpenOnboarding,
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

  /* ---------------- DESKTOP SIDEBAR CONTENT ---------------- */
  const desktopContent = (
    <div className="h-full flex flex-col justify-between p-4 select-none bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
      <div className="space-y-6">
        {/* Workspace Brand + Circle Switcher */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 stroke-[1.75]" />
              </div>
              <span className="font-semibold text-xs tracking-tight text-stone-900 dark:text-stone-100 uppercase font-mono">
                Wishlist
              </span>
            </div>

            {/* Theme Toggle Button (Desktop) */}
            <button
              onClick={onToggleTheme}
              title={currentTheme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )}
            </button>
          </div>

          {/* Active Family Selector Dropdown */}
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Семейный круг
              </span>
              <button
                onClick={onOpenGroupsModal}
                className="text-[10px] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium cursor-pointer"
              >
                + Сменить
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                {activeGroup?.name || 'Моя семья'}
              </div>
              {activeGroup && (
                <button
                  onClick={handleShare}
                  title="Скопировать ссылку для родственников"
                  className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-stone-900 dark:text-stone-100 stroke-[2.5]" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-2.5 h-2.5" />
                      <span>{activeGroup.invite_code}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Primary Views: Wishes vs Reservations */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500 px-2 mb-1.5">
            Разделы
          </div>

          <button
            onClick={() => onSelectView('wishes')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedView === 'wishes'
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Желания семьи</span>
            </div>
          </button>

          <button
            onClick={() => onSelectView('my_reservations')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedView === 'my_reservations'
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
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
                    ? 'bg-white/20 dark:bg-stone-900/20 text-white dark:text-stone-950'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {myReservationsCount}
              </span>
            )}
          </button>
        </div>

        {/* Family Members List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Родственники ({familyMembers.length})
            </span>
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
            {familyMembers.map((member) => {
              const isSelected =
                selectedView === 'wishes' && selectedUserId === member.id;
              const isMe = member.id === currentUser.id;
              const avatarStyle = getAvatarStyle(member.name);
              const initials = getInitials(member.name);

              return (
                <button
                  key={member.id}
                  onClick={() => {
                    onSelectUser(member.id);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-5 h-5 rounded-full border ${avatarStyle} flex items-center justify-center text-[9px] font-mono font-bold shrink-0`}
                    >
                      {initials}
                    </div>
                    <span className="truncate">
                      {member.name} {isMe && '(Вы)'}
                    </span>
                  </div>

                  {isMe && (
                    <span className="text-[9px] font-mono text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 rounded shrink-0">
                      моё
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: User profile, Onboarding & Logout */}
      <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 mt-6 space-y-2">
        <button
          onClick={onOpenOnboarding}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Как пользоваться сайтом</span>
        </button>

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
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate">
                семейный аккаунт
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Выйти"
            className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
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
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-stone-900 border-r border-stone-200/90 dark:border-stone-800 shrink-0 h-screen sticky top-0 overflow-y-auto">
        {desktopContent}
      </aside>

      {/* Mobile iOS Bottom Sheet */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />

          {/* Bottom Sheet Container */}
          <div className="relative w-full max-h-[85vh] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-t-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* iOS Drag Handle */}
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* Sheet Header */}
            <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-100">
                    Семья и круги
                  </h3>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                    {activeGroup?.name || 'Круг'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Theme toggle in mobile sheet */}
                <button
                  onClick={onToggleTheme}
                  className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer active:scale-95"
                  title="Сменить тему"
                >
                  {currentTheme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-stone-600" />
                  )}
                </button>

                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Body Scrollable */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* Active Circle & Invite Code */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Текущая семья
                  </span>
                  <button
                    onClick={() => {
                      onCloseMobile();
                      onOpenGroupsModal();
                    }}
                    className="text-xs text-stone-900 dark:text-stone-100 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Сменить круг
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-950 dark:text-stone-100">
                    {activeGroup?.name || 'Моя семья'}
                  </span>
                  {activeGroup && (
                    <button
                      onClick={handleShare}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-transform cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100 stroke-[2.5]" />
                          <span>Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                          <span>{activeGroup.invite_code}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Family Members list in bottom sheet */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                  Члены семьи ({familyMembers.length})
                </div>

                <div className="bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 rounded-2xl divide-y divide-stone-200/60 dark:divide-stone-800 overflow-hidden">
                  {familyMembers.map((member) => {
                    const isSelected =
                      selectedView === 'wishes' && selectedUserId === member.id;
                    const isMe = member.id === currentUser.id;
                    const avatarStyle = getAvatarStyle(member.name);
                    const initials = getInitials(member.name);

                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          onSelectUser(member.id);
                          onCloseMobile();
                        }}
                        className={`w-full p-3 flex items-center justify-between transition-colors cursor-pointer active:bg-stone-100 dark:active:bg-stone-800 ${
                          isSelected ? 'bg-white dark:bg-stone-800/80 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full border ${avatarStyle} flex items-center justify-center text-xs font-mono font-bold shrink-0`}
                          >
                            {initials}
                          </div>
                          <div className="text-left">
                            <div className="text-xs text-stone-900 dark:text-stone-100">
                              {member.name} {isMe && '(Вы)'}
                            </div>
                            <div className="text-[10px] text-stone-400 dark:text-stone-500">
                              {isMe ? 'Ваш вишлист' : 'Вишлист родственника'}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[10px] font-medium">
                            Выбран
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Onboarding Help link */}
              <button
                onClick={() => {
                  onCloseMobile();
                  onOpenOnboarding();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 text-xs font-medium cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Как пользоваться сайтом (обучение)</span>
              </button>

              {/* Profile & Logout in sheet */}
              <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full border ${getAvatarStyle(
                      currentUser.name
                    )} flex items-center justify-center text-xs font-mono font-bold`}
                  >
                    {getInitials(currentUser.name)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                      семейный аккаунт
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onCloseMobile();
                    onLogout();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
