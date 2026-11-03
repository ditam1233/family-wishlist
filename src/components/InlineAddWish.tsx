'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
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

  const isUrl = (text: string) => {
    try {
      const u = new URL(text.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    if (isUrl(clean)) {
      setLoading(true);
      try {
        const res = await fetch('/api/scrape-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clean }),
        });
        const data = await res.json();
        onAddWish({
          user_id: currentUserId,
          title: data.title || clean,
          description: data.description || undefined,
          link_url: clean,
          image_url: data.image || undefined,
          price: data.price ? parseFloat(data.price) : undefined,
          currency: '₽',
          priority: 'nice_to_have',
          event_tag: 'Без повода',
        });
      } catch {
        onAddWish({
          user_id: currentUserId,
          title: clean,
          link_url: clean,
          currency: '₽',
          priority: 'nice_to_have',
          event_tag: 'Без повода',
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
        event_tag: 'Без повода',
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-stone-200/90 hover:border-stone-400/80 transition-colors p-1.5 flex items-center gap-1.5 shadow-2xs"
    >
      <div className="pl-2.5 text-stone-400">
        <Plus className="w-4 h-4 stroke-[2]" />
      </div>

      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        placeholder="Быстро добавить: вставьте ссылку на товар или напишите название..."
        className="w-full bg-transparent px-2 py-1 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
      />

      <div className="flex items-center gap-1 shrink-0 pr-0.5">
        <button
          type="button"
          onClick={onOpenFullModal}
          title="Подробная форма"
          className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          type="submit"
          disabled={loading || !inputVal.trim()}
          className="h-8 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isUrl(inputVal) ? (
            <>
              <Sparkles className="w-3 h-3" />
              <span>Распознать</span>
            </>
          ) : (
            <span>Добавить</span>
          )}
        </button>
      </div>
    </form>
  );
};
