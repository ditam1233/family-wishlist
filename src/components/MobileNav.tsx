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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-4 shadow-lg select-none">
      <div className="flex items-center justify-around max-w-md mx-auto h-12">
        {/* Tab 1: Family / Groups */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-stone-500 active:text-stone-900 transition-colors cursor-pointer"
        >
          <Users className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-medium">Семья</span>
        </button>

        {/* Tab 2: Wishes */}
        <button
          onClick={() => onSelectView('wishes')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors cursor-pointer ${
            selectedView === 'wishes'
              ? 'text-stone-900 font-semibold'
              : 'text-stone-500'
          }`}
        >
          <Gift className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px]">Желания</span>
        </button>

        {/* Center: Quick Add Button */}
        <button
          onClick={onOpenAddWish}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-900 text-white shadow-md active:scale-95 transition-transform cursor-pointer -mt-3 border-2 border-stone-50"
          title="Добавить подарок"
        >
          <Plus className="w-5 h-5 stroke-[2.25]" />
        </button>

        {/* Tab 3: My Reservations */}
        <button
          onClick={() => onSelectView('my_reservations')}
          className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors cursor-pointer ${
            selectedView === 'my_reservations'
              ? 'text-stone-900 font-semibold'
              : 'text-stone-500'
          }`}
        >
          <div className="relative">
            <BookmarkCheck className="w-4 h-4 stroke-[1.75]" />
            {myReservationsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-stone-900 text-white text-[9px] font-mono font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                {myReservationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Я подарю</span>
        </button>
      </div>
    </nav>
  );
};
