'use client';

import React from 'react';
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

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; badge: string; dot: string }
> = {
  must_have: {
    label: 'Очень хочу',
    badge: 'bg-stone-900 text-stone-50 border-stone-900',
    dot: 'bg-stone-100',
  },
  nice_to_have: {
    label: 'Хочется',
    badge: 'bg-stone-100 text-stone-700 border-stone-200',
    dot: 'bg-stone-400',
  },
  dream: {
    label: 'Мечта',
    badge: 'bg-white text-stone-600 border-stone-300',
    dot: 'bg-stone-400',
  },
};

export const WishCard: React.FC<WishCardProps> = ({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
}) => {
  const prio = PRIORITY_CONFIG[wish.priority] || PRIORITY_CONFIG.nice_to_have;

  const handleReserve = () => {
    if (!wish.is_reserved) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
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
    <article className="group bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400/80 transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div>
        {/* Image header */}
        <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden border-b border-stone-100">
          {wish.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wish.image_url}
              alt={wish.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
              <Gift className="w-8 h-8 stroke-[1.25]" />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-tight font-medium border shadow-2xs backdrop-blur-xs ${prio.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                <span>{prio.label}</span>
              </span>

              {wish.event_tag && wish.event_tag !== 'Без повода' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/95 text-stone-600 border border-stone-200 shadow-2xs">
                  {wish.event_tag}
                </span>
              )}
            </div>

            {isOwner && (
              <button
                onClick={() => onDeleteWish(wish.id)}
                title="Удалить желание"
                className="pointer-events-auto p-1.5 bg-white/95 hover:bg-stone-900 text-stone-400 hover:text-white rounded-full border border-stone-200/80 shadow-2xs transition-all cursor-pointer opacity-70 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5">
          {wish.price !== undefined && wish.price > 0 && (
            <div className="text-lg font-semibold text-stone-900 font-mono tracking-tight mb-1">
              {formatPrice(wish.price, wish.currency)}
            </div>
          )}

          <h3 className="font-medium text-sm sm:text-base text-stone-900 leading-snug line-clamp-2">
            {wish.title}
          </h3>

          {wish.description && (
            <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {wish.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer action area */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 mt-auto space-y-3">
        {wish.link_url && (
          <a
            href={wish.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-stone-500 hover:text-stone-900 transition-colors pt-2.5 border-t border-stone-100"
          >
            <span className="truncate flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3 text-stone-400" />
              <span className="truncate">{hostname(wish.link_url)}</span>
            </span>
            <span className="text-[11px] font-mono text-stone-600 font-medium shrink-0 ml-2">
              Магазин ↗
            </span>
          </a>
        )}

        {/* Anti-spoiler secret booking */}
        {!isOwner && (
          <div>
            {wish.reserved_by_me ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 py-2 px-3 rounded-xl bg-stone-900 text-white text-xs font-medium flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-stone-300 stroke-[2.5]" />
                  <span>Вы дарите этот подарок</span>
                </div>
                <button
                  onClick={handleReserve}
                  className="py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-900 text-xs font-medium transition-all cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            ) : wish.is_reserved ? (
              <div className="py-2 px-3 rounded-xl bg-stone-100 border border-stone-200/80 text-stone-400 text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5 text-stone-400 stroke-[1.75]" />
                <span>Забронировано кем-то</span>
              </div>
            ) : (
              <button
                onClick={handleReserve}
                className="w-full py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Lock className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Подарю я (тайно)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
