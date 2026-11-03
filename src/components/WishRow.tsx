'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ExternalLink, Trash2, Lock, Check, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishRowProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean; owner_name?: string };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
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
  const prio = PRIORITY_CONFIG[wish.priority] || PRIORITY_CONFIG.nice_to_have;

  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wish.is_reserved) {
      try {
        confetti({
          particleCount: 35,
          spread: 55,
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
    <div className="group bg-white hover:bg-stone-50/80 active:bg-stone-100/70 p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors">
      {/* Left: iOS Rounded Thumbnail */}
      <div className="relative w-12 h-12 sm:w-11 sm:h-11 rounded-xl bg-stone-100 border border-stone-200/70 overflow-hidden shrink-0 flex items-center justify-center">
        {wish.image_url && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wish.image_url}
            alt=""
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <Gift className="w-5 h-5 text-stone-300 stroke-[1.5]" />
        )}
      </div>

      {/* Middle: Title, Shop & Metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold sm:font-medium text-[13.5px] sm:text-sm text-stone-950 truncate max-w-full">
            {wish.title}
          </span>

          {wish.event_tag && wish.event_tag !== 'Без повода' && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-stone-100 text-stone-600 shrink-0">
              {wish.event_tag}
            </span>
          )}
        </div>

        {wish.description && (
          <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
            {wish.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1 font-mono text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
            <span>{prio.label}</span>
          </span>

          {wish.link_url && (
            <a
              href={wish.link_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-900 active:text-stone-900 transition-colors font-mono text-[10px]"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span className="truncate max-w-[120px]">
                {hostname(wish.link_url)}
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Right: Price & Tap Action */}
      <div className="flex flex-col sm:flex-row sm:items-center items-end gap-1.5 sm:gap-3 shrink-0">
        {wish.price !== undefined && wish.price > 0 && (
          <div className="text-xs sm:text-sm font-bold font-mono text-stone-900">
            {formatPrice(wish.price, wish.currency)}
          </div>
        )}

        {!isOwner ? (
          <div>
            {wish.reserved_by_me ? (
              <button
                onClick={handleReserve}
                className="px-2.5 py-1.5 rounded-full bg-stone-900 text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs active:scale-95 transition-transform cursor-pointer"
              >
                <Check className="w-3 h-3 text-stone-300 stroke-[2.5]" />
                <span>Вы дарите</span>
              </button>
            ) : wish.is_reserved ? (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-400 text-[11px] font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-stone-400" />
                <span>Занято</span>
              </span>
            ) : (
              <button
                onClick={handleReserve}
                className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-900 border border-stone-200 text-[11px] font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Lock className="w-2.5 h-2.5 text-stone-600" />
                <span>Подарю я</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onDeleteWish(wish.id)}
            title="Удалить желание"
            className="p-2 text-stone-300 hover:text-red-600 active:text-red-600 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
          </button>
        )}
      </div>
    </div>
  );
};
