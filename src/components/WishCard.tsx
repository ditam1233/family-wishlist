'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { formatPrice } from '@/lib/utils';
import { normalizeUrl } from '@/lib/scraper';
import { Button, Chip } from '@heroui/react';
import {
  Gift,
  CheckCircle2,
  Lock,
  Trash2,
  Pencil,
  ExternalLink,
} from 'lucide-react';

interface WishCardProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
  onEditWish?: (wish: Wish) => void;
}

export const WishCard: React.FC<WishCardProps> = React.memo(function WishCard({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
  onEditWish,
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleReserve = async () => {
    if (!wish.is_reserved) {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#ec4899', '#10b981'],
        });
      } catch {
        /* noop */
      }
    }
    onToggleReserve(wish.id);
  };

  const cleanLinkUrl = wish.link_url ? normalizeUrl(wish.link_url) : '';

  const getDomain = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(cleanLinkUrl);

  const priorityLabels: Record<string, { label: string; color: string }> = {
    must_have: {
      label: 'Очень хочу',
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    },
    dream: {
      label: 'Мечта',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    nice_to_have: {
      label: 'Буду рад',
      color: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20',
    },
  };

  const priorityInfo = wish.priority ? priorityLabels[wish.priority] : null;

  return (
    <div className="group taste-card flex flex-col justify-between h-full rounded-[22px] bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-xs hover:shadow-lg transition-all overflow-hidden">
      <div>
        {/* Card Media / Image Header */}
        <div className="relative w-full pt-[62%] bg-stone-100 dark:bg-stone-800/60 overflow-hidden">
          {wish.image_url && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-stone-200 dark:bg-stone-800" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wish.image_url}
                alt={wish.title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`taste-zoom absolute inset-0 w-full h-full object-cover ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300 dark:text-stone-600">
              <Gift className="w-12 h-12 stroke-[1.2]" />
            </div>
          )}

          {/* Badges Over Image */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
            {wish.is_reserved ? (
              <Chip
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs pointer-events-auto border-0 ${
                  wish.reserved_by_me
                    ? 'bg-emerald-600/90 text-white'
                    : 'bg-stone-900/80 text-stone-200'
                }`}
              >
                {wish.reserved_by_me ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Вы дарите</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Забронировано</span>
                  </>
                )}
              </Chip>
            ) : (
              <div />
            )}

            {wish.price && wish.price > 0 && (
              <Chip className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-stone-950/80 text-white backdrop-blur-md shadow-xs pointer-events-auto border-0">
                {formatPrice(wish.price, wish.currency)}
              </Chip>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
            {wish.title}
          </h3>

          {wish.description && (
            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
              {wish.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {priorityInfo && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border ${priorityInfo.color}`}
              >
                {priorityInfo.label}
              </span>
            )}

            {domain && cleanLinkUrl && (
              <a
                href={cleanLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span>{domain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 pt-0">
        {isOwner ? (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
            {onEditWish && (
              <button
                type="button"
                title="Редактировать"
                onClick={() => onEditWish(wish)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              title="Удалить"
              onClick={() => onDeleteWish(wish.id)}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
            {wish.is_reserved ? (
              wish.reserved_by_me ? (
                <Button
                  size="md"
                  variant="outline"
                  onPress={handleReserve}
                  className="taste-btn w-full rounded-xl font-medium border-emerald-500/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-2 h-10 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Вы дарите (Отменить)</span>
                </Button>
              ) : (
                <Button
                  size="md"
                  isDisabled
                  className="w-full rounded-xl font-medium opacity-60 bg-stone-100 dark:bg-stone-800/80 text-stone-400 gap-2 h-10"
                >
                  <Lock className="w-4 h-4" />
                  <span>Забронировано</span>
                </Button>
              )
            ) : (
              <Button
                size="md"
                onPress={handleReserve}
                className="taste-btn w-full rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/20 gap-2 h-10 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Подарю я!</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

WishCard.displayName = 'WishCard';
