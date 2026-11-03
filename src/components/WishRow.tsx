'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ExternalLink, Trash2, Lock, Check, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishRowProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
}

const PRIORITY_DOTS: Record<Priority, { label: string; dot: string }> = {
  must_have: { label: 'Очень хочу', dot: 'bg-stone-900' },
  nice_to_have: { label: 'Хочется', dot: 'bg-stone-400' },
  dream: { label: 'Мечта', dot: 'bg-stone-300' },
};

export const WishRow: React.FC<WishRowProps> = ({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
}) => {
  const [imageError, setImageError] = useState(false);
  const prio = PRIORITY_DOTS[wish.priority] || PRIORITY_DOTS.nice_to_have;

  const handleReserve = () => {
    if (!wish.is_reserved) {
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#171717', '#78716c', '#d6d3d1'],
        });
      } catch {
        /* noop */
      }
    }
    onToggleReserve(wish.id);
  };

  const hostname = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <div className="group bg-white hover:bg-stone-50/70 border-b border-stone-100 last:border-b-0 py-3.5 px-3.5 sm:px-4 flex items-center justify-between gap-3 transition-colors">
      {/* Left: Thumbnail & info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200/60 overflow-hidden shrink-0 flex items-center justify-center">
          {wish.image_url && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wish.image_url}
              alt=""
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Gift className="w-4 h-4 text-stone-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs sm:text-sm text-stone-900 truncate">
              {wish.title}
            </span>

            {wish.event_tag && wish.event_tag !== 'Без повода' && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-100 text-stone-600 shrink-0">
                {wish.event_tag}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1 font-mono text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
              <span>{prio.label}</span>
            </span>

            {wish.link_url && (
              <a
                href={wish.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 text-stone-400 hover:text-stone-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[140px]">
                  {hostname(wish.link_url)}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right: Price & Reservation / Delete */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {wish.price !== undefined && wish.price > 0 && (
          <div className="text-xs sm:text-sm font-semibold font-mono text-stone-900">
            {formatPrice(wish.price, wish.currency)}
          </div>
        )}

        {!isOwner ? (
          <div>
            {wish.reserved_by_me ? (
              <div className="flex items-center gap-1">
                <span className="px-2.5 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 text-stone-300 stroke-[2.5]" />
                  <span className="hidden sm:inline">Вы дарите</span>
                </span>
                <button
                  onClick={handleReserve}
                  className="px-2 py-1.5 text-[11px] text-stone-400 hover:text-stone-900 rounded-lg cursor-pointer active:scale-95"
                >
                  Отмена
                </button>
              </div>
            ) : wish.is_reserved ? (
              <span className="px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-400 text-[11px] font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-stone-400" />
                <span className="hidden sm:inline">Занято</span>
              </span>
            ) : (
              <button
                onClick={handleReserve}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Lock className="w-3 h-3" />
                <span>Подарю я</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onDeleteWish(wish.id)}
            title="Удалить желание"
            className="p-2 text-stone-300 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>
        )}
      </div>
    </div>
  );
};
