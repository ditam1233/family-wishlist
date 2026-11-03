'use client';

import React from 'react';
import { User } from '@/types';
import { getInitials, getAvatarGradient } from '@/lib/avatar';
import { Gift, Plus, Users, LogOut, ChevronDown } from 'lucide-react';

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
  const gradient = getAvatarGradient(currentUser.name);
  const initials = getInitials(currentUser.name);

  return (
    <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-warm-200/60">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm shadow-warm-300/30 flex items-center justify-center">
            <Gift className="w-5 h-5 text-accent" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-warm-800 text-base tracking-tight hidden sm:block">
            Вишлист
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddWish}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-sm shadow-accent/15 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Добавить</span>
          </button>

          <button
            onClick={onOpenGroups}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium bg-white border border-warm-200/80 text-warm-700 hover:border-warm-300 hover:bg-warm-50 shadow-xs transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-warm-500" />
            <span className="hidden sm:inline">Семьи</span>
          </button>

          {/* User avatar + menu */}
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-warm-200/60">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}
            >
              {initials}
            </div>
            <span className="text-xs font-medium text-warm-700 hidden md:block max-w-[100px] truncate">
              {currentUser.name}
            </span>
            <button
              onClick={onLogout}
              title="Выйти"
              className="p-1.5 text-warm-400 hover:text-accent rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
