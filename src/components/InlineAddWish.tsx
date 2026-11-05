'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { extractUrlAndTitle } from '@/lib/scraper';
import { Button } from '@heroui/react';
import { Plus, SlidersHorizontal } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    const { url: detectedUrl, extractedTitle } = extractUrlAndTitle(clean);
    const hasUrl = Boolean(
      detectedUrl &&
        (detectedUrl.startsWith('http://') || detectedUrl.startsWith('https://'))
    );

    if (hasUrl) {
      onAddWish({
        user_id: currentUserId,
        title: extractedTitle || 'Подарок по ссылке',
        link_url: detectedUrl,
        currency: '₽',
        priority: 'nice_to_have',
      });
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
        colors: ['#6366f1', '#ec4899', '#10b981'],
      });
    } catch {
      /* noop */
    }

    setInputVal('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-1.5 pl-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all"
    >
      <div className="text-stone-400 dark:text-stone-500 shrink-0">
        <Plus className="w-4 h-4" />
      </div>

      <input
        type="text"
        className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
        placeholder="Вставьте ссылку на товар или напишите название..."
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
      />

      {inputVal.trim() && (
        <Button
          type="submit"
          size="sm"
          className="rounded-xl px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-xs transition-all"
        >
          Добавить
        </Button>
      )}

      <button
        type="button"
        title="Подробные параметры (фото, приоритет, цена)"
        onClick={onOpenFullModal}
        className="p-1.5 rounded-xl text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>
    </form>
  );
};
