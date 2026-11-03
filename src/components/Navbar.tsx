'use client';

import React from 'react';
import { User } from '@/types';
import { getInitials, getAvatarStyle } from '@/lib/avatar';
import { Plus, Users, LogOut, Gift } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onOpenAddWish: () => void;
  onOpenGroups: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAddWish,
  onOpenGroups,
  onLogout,
}) => {
  const avatarStyle = getAvatarStyle(currentUser.name);
  const initials = getInitials(currentUser.name);

  return (
    <header className="sticky top-0 z-30 bg-stone-50/85 backdrop-blur-md border-b border-stone-200/70 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Minimalist Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
            <Gift className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-stone-900 text-sm tracking-tight uppercase font-mono">
              Wishlist
            </span>
            <span className="hidden sm:inline-block text-[11px] text-stone-400 font-normal">
              / семейный круг
            </span>
          </div>
        </div>

        {/* Minimalist Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenAddWish}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
            <span>Добавить</span>
          </button>

          <button
            onClick={onOpenGroups}
            className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full text-xs font-medium bg-stone-200/60 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
            title="Семейные круги"
          >
            <Users className="w-3.5 h-3.5 text-stone-500 stroke-[1.75]" />
            <span className="hidden sm:inline">Круги</span>
          </button>

          {/* User profile item */}
          <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-stone-200">
            <div
              className={`w-8 h-8 rounded-full border ${avatarStyle} flex items-center justify-center text-[11px] font-semibold tracking-wider font-mono`}
              title={currentUser.name}
            >
              {initials}
            </div>
            <span className="hidden md:block text-xs font-medium text-stone-800 max-w-[120px] truncate">
              {currentUser.name}
            </span>
            <button
              onClick={onLogout}
              title="Выйти"
              className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 rounded-full transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
