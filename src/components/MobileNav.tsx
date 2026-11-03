'use client';

import React from 'react';
import { Gift, BookmarkCheck, Plus, Users } from 'lucide-react';

interface MobileNavProps {
  selectedView: 'wishes' | 'my_reservations';
  onSelectView: (view: 'wishes' | 'my_reservations') => void;
  myReservationsCount: number;
  onOpenSidebar: () => void;
  onOpenAddWish: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  selectedView,
  onSelectView,
  myReservationsCount,
  onOpenSidebar,
  onOpenAddWish,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border-t border-stone-200/70 dark:border-stone-800 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-6 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between max-w-sm mx-auto h-12">
        {/* Tab 1: Wishes */}
        <button
          onClick={() => onSelectView('wishes')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
            selectedView === 'wishes'
              ? 'text-stone-950 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <Gift
            className={`w-5 h-5 ${
              selectedView === 'wishes' ? 'stroke-[2.2]' : 'stroke-[1.6]'
            }`}
          />
          <span className="text-[10px] tracking-tight">Желания</span>
        </button>

        {/* Tab 2: Reservations */}
        <button
          onClick={() => onSelectView('my_reservations')}
          className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
            selectedView === 'my_reservations'
              ? 'text-stone-950 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <div className="relative">
            <BookmarkCheck
              className={`w-5 h-5 ${
                selectedView === 'my_reservations'
                  ? 'stroke-[2.2]'
                  : 'stroke-[1.6]'
              }`}
            />
            {myReservationsCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900">
                {myReservationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Я подарю</span>
        </button>

        {/* Tab 3: Family / Circles */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 active:text-stone-950 dark:active:text-stone-100 active:scale-95 transition-all cursor-pointer"
        >
          <Users className="w-5 h-5 stroke-[1.6]" />
          <span className="text-[10px] tracking-tight">Семья</span>
        </button>

        {/* Center/Action: Add Wish Floating Button */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={onOpenAddWish}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-md active:scale-90 transition-transform cursor-pointer border-2 border-stone-50 dark:border-stone-800"
            title="Добавить подарок"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>
      </div>
    </nav>
  );
};
