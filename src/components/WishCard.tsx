'use client';

import React from 'react';
import { Wish, Priority } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ExternalLink, Trash2, Gift, Lock, CheckCircle2, Heart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WishCardProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; badge: string; icon: string }
> = {
  must_have: {
    label: 'Очень хочу',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/60',
    icon: '🔥',
  },
  nice_to_have: {
    label: 'Хочется',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/60',
    icon: '⭐',
  },
  dream: {
    label: 'Мечта',
    badge: 'bg-violet-50 text-violet-700 border-violet-200/60',
    icon: '✨',
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
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.75 } });
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
    <div className="group bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image container */}
      <div className="relative aspect-4/3 bg-slate-100/80 overflow-hidden">
        {wish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wish.image_url}
            alt={wish.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-indigo-50/30">
            <Gift className="w-12 h-12 text-slate-300 group-hover:text-indigo-400 transition-colors" strokeWidth={1.2} />
          </div>
        )}

        {/* Floating badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border shadow-xs ${prio.badge}`}
            >
              <span>{prio.icon}</span>
              <span>{prio.label}</span>
            </span>

            {wish.event_tag && wish.event_tag !== 'Без повода' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/95 backdrop-blur-md text-slate-600 border border-slate-200/60 shadow-xs">
                {wish.event_tag}
              </span>
            )}
          </div>

          {isOwner && (
            <button
              onClick={() => onDeleteWish(wish.id)}
              title="Удалить"
              className="p-2 bg-white/95 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full shadow-sm transition-all cursor-pointer opacity-80 group-hover:opacity-100"
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
            <p className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
              {formatPrice(wish.price, wish.currency)}
            </p>
          )}

          <h3 className="font-semibold text-base text-slate-800 leading-snug mb-1.5 line-clamp-2">
            {wish.title}
          </h3>

          {wish.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
              {wish.description}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3.5 border-t border-slate-100 space-y-3 mt-auto">
          {wish.link_url && (
            <a
              href={wish.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors group/link"
            >
              <span className="flex items-center gap-1.5 truncate">
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover/link:text-indigo-600" />
                <span className="truncate">{hostname(wish.link_url)}</span>
              </span>
              <span className="text-indigo-600 font-semibold shrink-0 ml-2 group-hover/link:underline">
                Открыть магазин →
              </span>
            </a>
          )}

          {/* Anti-spoiler secret booking */}
          {!isOwner && (
            <div>
              {wish.reserved_by_me ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Вы дарите этот подарок!</span>
                  </div>
                  <button
                    onClick={handleReserve}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    Отменить
                  </button>
                </div>
              ) : wish.is_reserved ? (
                <div className="py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Уже забронировано кем-то</span>
                </div>
              ) : (
                <button
                  onClick={handleReserve}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Подарю я! (тайно)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
