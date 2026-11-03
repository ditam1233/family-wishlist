'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { Plus, Sparkles, Loader2, SlidersHorizontal } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InlineAddWishProps {
  currentUserId: string;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
  onOpenFullModal: () => void;
}

export const InlineAddWish: React.FC<InlineAddWishProps> = ({
  currentUserId,
  onAddWish,
  onOpenFullModal,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeUrl = (text: string): string | null => {
    let clean = text.trim();
    if (!clean) return null;
    if (
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(clean) &&
      !clean.startsWith('http://') &&
      !clean.startsWith('https://')
    ) {
      clean = 'https://' + clean;
    }
    try {
      const u = new URL(clean);
      return u.protocol === 'http:' || u.protocol === 'https:' ? clean : null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    const detectedUrl = normalizeUrl(clean);

    if (detectedUrl) {
      setLoading(true);
      try {
        const res = await fetch('/api/scrape-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: detectedUrl }),
        });
        const data = await res.json();
        onAddWish({
          user_id: currentUserId,
          title: data.title || clean,
          description: data.description || undefined,
          link_url: detectedUrl,
          image_url: data.image || undefined,
          price: data.price ? parseFloat(data.price) : undefined,
          currency: '₽',
          priority: 'nice_to_have',
        });
      } catch {
        onAddWish({
          user_id: currentUserId,
          title: clean,
          link_url: detectedUrl,
          currency: '₽',
          priority: 'nice_to_have',
        });
      } finally {
        setLoading(false);
      }
    } else {
      onAddWish({
        user_id: currentUserId,
        title: clean,
        currency: '₽',
        priority: 'nice_to_have',
      });
    }

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#171717', '#78716c', '#d6d3d1'],
      });
    } catch {
      /* noop */
    }

    setInputVal('');
  };

  const isCurrentUrl = Boolean(normalizeUrl(inputVal));

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 hover:border-stone-400/80 dark:hover:border-stone-600 transition-colors p-2 flex items-center gap-1.5 shadow-2xs"
    >
      <div className="pl-2 text-stone-400 dark:text-stone-500">
        <Plus className="w-4 h-4 stroke-[2]" />
      </div>

      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        placeholder="Ссылка на товар или название..."
        className="w-full bg-transparent px-2 py-1 text-base sm:text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
      />

      <div className="flex items-center gap-1 shrink-0 pr-0.5">
        <button
          type="button"
          onClick={onOpenFullModal}
          title="Подробная форма"
          className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={loading || !inputVal.trim()}
          className="h-9 px-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-30 text-white dark:text-stone-950 font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isCurrentUrl ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Распознать</span>
            </>
          ) : (
            <span>Добавить</span>
          )}
        </button>
      </div>
    </form>
  );
};
