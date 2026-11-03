'use client';

import React from 'react';
import { Wish, Priority } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ExternalLink, Trash2, Gift, Lock, CheckCircle2, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishCardProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string }
> = {
  must_have: { label: 'Очень хочу', dot: 'bg-red-400' },
  nice_to_have: { label: 'Было бы здорово', dot: 'bg-amber-400' },
  dream: { label: 'Мечта', dot: 'bg-violet-400' },
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
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.75 } });
      } catch { /* noop */ }
    }
    onToggleReserve(wish.id);
  };

  const hostname = (url?: string) => {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  };

  return (
    <div className="group bg-white rounded-3xl border border-warm-200/70 shadow-sm shadow-warm-200/20 hover:shadow-lg hover:shadow-warm-300/20 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-4/3 bg-warm-100 overflow-hidden">
        {wish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wish.image_url}
            alt={wish.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-warm-300">
            <Gift className="w-10 h-10 mb-1" strokeWidth={1} />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur-md text-warm-700 shadow-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
              {prio.label}
            </span>
            {wish.event_tag && wish.event_tag !== 'Без повода' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/90 backdrop-blur-md text-warm-600 shadow-sm">
                {wish.event_tag}
              </span>
            )}
          </div>

          {isOwner && (
            <button
              onClick={() => onDeleteWish(wish.id)}
              className="p-1.5 bg-white/90 backdrop-blur-md text-warm-400 hover:text-red-500 rounded-full shadow-sm transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1">
          {wish.price !== undefined && wish.price > 0 && (
            <p className="text-lg font-bold text-warm-900 mb-0.5 tracking-tight">
              {formatPrice(wish.price, wish.currency)}
            </p>
          )}
          <h3 className="font-semibold text-[15px] text-warm-800 leading-snug mb-1.5 line-clamp-2">
            {wish.title}
          </h3>
          {wish.description && (
            <p className="text-xs text-warm-500 line-clamp-2 leading-relaxed mb-3">
              {wish.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-warm-100 space-y-2.5 mt-auto">
          {wish.link_url && (
            <a
              href={wish.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-warm-500 hover:text-accent transition-colors"
            >
              <span className="flex items-center gap-1.5 truncate">
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{hostname(wish.link_url)}</span>
              </span>
              <span className="text-accent font-medium shrink-0 ml-2">Перейти →</span>
            </a>
          )}

          {!isOwner && (
            <>
              {wish.reserved_by_me ? (
                <div className="flex gap-2">
                  <div className="flex-1 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Вы дарите
                  </div>
                  <button
                    onClick={handleReserve}
                    className="py-2.5 px-3.5 rounded-2xl border border-warm-200 text-warm-500 hover:text-red-500 hover:border-red-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Отменить
                  </button>
                </div>
              ) : wish.is_reserved ? (
                <div className="py-2.5 rounded-2xl bg-warm-100/80 border border-warm-200/60 text-warm-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  Уже забронировано
                </div>
              ) : (
                <button
                  onClick={handleReserve}
                  className="w-full py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm shadow-accent/15 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Подарю я!
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
