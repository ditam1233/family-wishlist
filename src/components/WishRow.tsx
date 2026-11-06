'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { formatPrice } from '@/lib/utils';
import { normalizeUrl } from '@/lib/scraper';
import { Button } from '@heroui/react';
import {
  Gift,
  CheckCircle2,
  Lock,
  Trash2,
  Pencil,
  ExternalLink,
} from 'lucide-react';

interface WishRowProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
  onEditWish?: (wish: Wish) => void;
}

export const WishRow: React.FC<WishRowProps> = React.memo(function WishRow({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
  onEditWish,
}) {
  const [imgError, setImgError] = useState(false);

  const handleReserve = async () => {
    if (!wish.is_reserved) {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 30,
          spread: 55,
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

  return (
    <div className="group taste-card flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-xs hover:shadow-md transition-all">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-stone-100 dark:bg-stone-800/70 flex items-center justify-center border border-stone-200/50 dark:border-white/[0.06]">
        {!imgError && wish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wish.image_url}
            alt={wish.title}
            onError={() => setImgError(true)}
            className="taste-zoom w-full h-full object-cover"
          />
        ) : (
          <Gift className="w-6 h-6 text-stone-400 dark:text-stone-500" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate mb-1">
          {wish.title}
        </h3>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {wish.price && wish.price > 0 && (
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {formatPrice(wish.price, wish.currency)}
            </span>
          )}

          {domain && cleanLinkUrl && (
            <a
              href={cleanLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <span>{domain}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isOwner ? (
          <div className="flex items-center gap-1">
            {onEditWish && (
              <button
                type="button"
                title="Редактировать"
                onClick={() => onEditWish(wish)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              title="Удалить"
              onClick={() => onDeleteWish(wish.id)}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            {wish.is_reserved ? (
              wish.reserved_by_me ? (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={handleReserve}
                  className="taste-btn rounded-xl font-medium border-emerald-500/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Я подарю</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  isDisabled
                  className="rounded-xl opacity-60 bg-stone-100 dark:bg-stone-800 text-stone-400 gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Забронировано</span>
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onPress={handleReserve}
                className="taste-btn rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/20 gap-1.5 cursor-pointer"
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

WishRow.displayName = 'WishRow';
