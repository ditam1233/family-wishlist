'use client';

import React from 'react';
import { User } from '@/types';
import { getInitials, getAvatarGradient } from '@/lib/avatar';
import { Gift, Plus, Users, LogOut, Sparkles } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Modern Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Gift className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-base tracking-tight">
                Family Wishlist
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                <Sparkles className="w-2.5 h-2.5" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Тайные подарки для всей семьи
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddWish}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Добавить желание</span>
          </button>

          <button
            onClick={onOpenGroups}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-medium bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 transition-all cursor-pointer"
            title="Управление семьями"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Семьи</span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2 ml-1 pl-2.5 border-l border-slate-200">
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white`}
            >
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
                {currentUser.name}
              </div>
              <span className="text-[10px] text-slate-400">Онлайн</span>
            </div>
            <button
              onClick={onLogout}
              title="Выйти"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
