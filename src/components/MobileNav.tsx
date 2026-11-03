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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-200/70 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-6 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between max-w-sm mx-auto h-12">
        {/* Tab 1: Wishes */}
        <button
          onClick={() => onSelectView('wishes')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
            selectedView === 'wishes'
              ? 'text-stone-950 font-semibold'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Gift className={`w-5 h-5 ${selectedView === 'wishes' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
          <span className="text-[10px] tracking-tight">Желания</span>
        </button>

        {/* Tab 2: Reservations */}
        <button
          onClick={() => onSelectView('my_reservations')}
          className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all cursor-pointer active:scale-95 ${
            selectedView === 'my_reservations'
              ? 'text-stone-950 font-semibold'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <div className="relative">
            <BookmarkCheck className={`w-5 h-5 ${selectedView === 'my_reservations' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
            {myReservationsCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-stone-900 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {myReservationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Я подарю</span>
        </button>

        {/* Tab 3: Family / Circles */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-stone-400 hover:text-stone-600 active:text-stone-950 active:scale-95 transition-all cursor-pointer"
        >
          <Users className="w-5 h-5 stroke-[1.6]" />
          <span className="text-[10px] tracking-tight">Семья</span>
        </button>

        {/* Center/Action: Add Wish Floating Button */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={onOpenAddWish}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-900 text-white shadow-md active:scale-90 transition-transform cursor-pointer border-2 border-stone-50"
            title="Добавить подарок"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>
      </div>
    </nav>
  );
};
