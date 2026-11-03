'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ExternalLink, Trash2, Lock, Check, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishCardProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
}

const PRIORITY_BADGES: Record<Priority, { label: string; dot: string }> = {
  must_have: { label: 'Очень хочу', dot: 'bg-stone-900' },
  nice_to_have: { label: 'Хочется', dot: 'bg-stone-400' },
  dream: { label: 'Мечта', dot: 'bg-stone-300' },
};

export const WishCard: React.FC<WishCardProps> = ({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
}) => {
  const [imageError, setImageError] = useState(false);
  const prio = PRIORITY_BADGES[wish.priority] || PRIORITY_BADGES.nice_to_have;

  const handleReserve = () => {
    if (!wish.is_reserved) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
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
    <div className="group bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400/80 transition-all flex flex-col justify-between overflow-hidden shadow-2xs">
      <div>
        {/* Top Image or Minimalist Pattern */}
        <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden border-b border-stone-100 flex items-center justify-center">
          {wish.image_url && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wish.image_url}
              alt={wish.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-300">
              <Gift className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}

          {/* Badges on image */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/95 backdrop-blur-xs text-stone-800 shadow-2xs border border-stone-200/50">
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
              <span>{prio.label}</span>
            </span>

            {wish.event_tag && wish.event_tag !== 'Без повода' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/95 backdrop-blur-xs text-stone-600 shadow-2xs border border-stone-200/50">
                {wish.event_tag}
              </span>
            )}
          </div>

          {/* Owner delete button */}
          {isOwner && (
            <button
              onClick={() => onDeleteWish(wish.id)}
              title="Удалить желание"
              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-400 hover:text-stone-900 shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-stone-900 text-sm leading-snug line-clamp-2">
              {wish.title}
            </h3>
            {wish.price !== undefined && wish.price > 0 && (
              <span className="font-mono font-semibold text-xs text-stone-900 shrink-0 mt-0.5">
                {formatPrice(wish.price, wish.currency)}
              </span>
            )}
          </div>

          {wish.description && (
            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {wish.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 pt-0">
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {wish.link_url ? (
            <a
              href={wish.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-400 hover:text-stone-900 transition-colors truncate max-w-[150px]"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{hostname(wish.link_url)}</span>
            </a>
          ) : (
            <span className="text-[10px] font-mono text-stone-300">
              без ссылки
            </span>
          )}

          {/* Reservation controls for relatives */}
          {!isOwner && (
            <div>
              {wish.reserved_by_me ? (
                <button
                  onClick={handleReserve}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-medium transition-all cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 text-stone-300 stroke-[2.5]" />
                  <span>Вы дарите</span>
                </button>
              ) : wish.is_reserved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span>Занято</span>
                </span>
              ) : (
                <button
                  onClick={handleReserve}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Lock className="w-3 h-3" />
                  <span>Подарю я</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
