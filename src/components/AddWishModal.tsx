'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { X, Sparkles, Loader2, Link2, DollarSign, Tag, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddWishModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
}

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 'must_have', label: 'Очень хочу', dot: 'bg-stone-900' },
  { value: 'nice_to_have', label: 'Хочется', dot: 'bg-stone-400' },
  { value: 'dream', label: 'Мечта', dot: 'bg-stone-300' },
];

const EVENTS = ['Без повода', 'День рождения', 'Новый год', 'Годовщина'];

export const AddWishModal: React.FC<AddWishModalProps> = ({
  isOpen,
  currentUserId,
  onClose,
  onAddWish,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState<Priority>('nice_to_have');
  const [eventTag, setEventTag] = useState('Без повода');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen) return null;

  const normalizeUrl = (raw: string): string => {
    let clean = raw.trim();
    if (!clean) return '';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  };

  const handleScrape = async () => {
    const cleanUrl = normalizeUrl(linkUrl);
    if (!cleanUrl) return;

    setLoading(true);
    setImgError(false);
    try {
      const res = await fetch('/api/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();

      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.image && !imageUrl) setImageUrl(data.image);
      if (data.price && !price) setPrice(data.price);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddWish({
      user_id: currentUserId,
      title: title.trim(),
      description: description.trim() || undefined,
      link_url: normalizeUrl(linkUrl) || undefined,
      image_url: imageUrl.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      currency: '₽',
      priority,
      event_tag: eventTag,
    });

    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#171717', '#78716c', '#d6d3d1'],
      });
    } catch {
      // noop
    }

    // Reset
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setImageUrl('');
    setPrice('');
    setPriority('nice_to_have');
    setEventTag('Без повода');
    onClose();
  };

  // text-base on mobile prevents iOS Safari zoom; sm:text-xs on desktop keeps it compact
  const inputClass =
    'w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all placeholder:text-stone-400';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border-t sm:border border-stone-200/90 shadow-2xl p-5 sm:p-6 relative">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto -mt-1 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight">
            Новое желание
          </h2>
          <p className="text-[11px] text-stone-500 font-mono">
            / добавьте подарок в ваш список
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link URL with auto-fill */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Ссылка на товар (Ozon, WB, Маркет...)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={() => {
                    if (linkUrl && !title) handleScrape();
                  }}
                  placeholder="https://..."
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button
                type="button"
                onClick={handleScrape}
                disabled={loading || !linkUrl.trim()}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 disabled:opacity-40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Автозаполнение</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Название <span className="text-stone-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Беспроводные наушники"
              className={inputClass}
            />
          </div>

          {/* Price & Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Примерная цена (₽)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5000"
                  className={`${inputClass} pl-9 font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Повод
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={eventTag}
                  onChange={(e) => setEventTag(e.target.value)}
                  className={`${inputClass} pl-9 appearance-none bg-right`}
                >
                  {EVENTS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Priority switcher */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Приоритет
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : p.dot
                      }`}
                    />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image URL preview */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Ссылка на изображение
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgError(false);
              }}
              placeholder="https://.../photo.jpg"
              className={inputClass}
            />
            {imageUrl && !imgError && (
              <div className="mt-2.5 w-16 h-16 rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Примечание (размер, цвет, пожелания)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например: цвет серый, размер M..."
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Gift className="w-4 h-4" />
              <span>Добавить в вишлист</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
