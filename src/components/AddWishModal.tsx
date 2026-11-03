'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddWishModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
}

export const AddWishModal: React.FC<AddWishModalProps> = ({
  isOpen,
  currentUserId,
  onClose,
  onAddWish,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('nice_to_have');
  const [eventTag, setEventTag] = useState('Без повода');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setScrapeError(null);
    try {
      const res = await fetch('/api/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.title) setTitle(data.title);
      if (data.image) setImageUrl(data.image);
      if (data.price) setPrice(String(data.price));
      if (data.description && !description) setDescription(data.description);
    } catch {
      setScrapeError('Не удалось извлечь данные с сайта. Заполните поля вручную.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddWish({
      user_id: currentUserId,
      title: title.trim(),
      description: description.trim() || undefined,
      link_url: url.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      currency: '₽',
      priority,
      event_tag: eventTag,
    });
    try {
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#171717', '#78716c', '#d6d3d1'],
      });
    } catch {
      /* noop */
    }
    setUrl('');
    setTitle('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setPriority('nice_to_have');
    setEventTag('Без повода');
    onClose();
  };

  const inputClass =
    'w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all placeholder:text-stone-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200/90 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md p-5 border-b border-stone-100 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-stone-900 tracking-tight">
              Новое желание
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Вставьте ссылку на товар или введите данные
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* URL + Scrape */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
              Ссылка на товар (Ozon, WB, Маркет...)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setScrapeError(null);
                }}
                placeholder="https://..."
                className={`${inputClass} flex-1 text-xs`}
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={isLoading || !url}
                className="h-[38px] px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isLoading ? 'Загрузка...' : 'Заполнить'}</span>
              </button>
            </div>
            {scrapeError && (
              <p className="text-xs text-stone-500 bg-stone-100 p-2.5 rounded-lg mt-2 border border-stone-200">
                {scrapeError}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Название <span className="text-stone-900">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Что вы хотите получить в подарок?"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                  Повод
                </label>
                <select
                  value={eventTag}
                  onChange={(e) => setEventTag(e.target.value)}
                  className={inputClass}
                >
                  <option value="Без повода">Без повода</option>
                  <option value="День рождения">День рождения</option>
                  <option value="Новый год">Новый год</option>
                  <option value="Новоселье">Новоселье</option>
                  <option value="Годовщина">Годовщина</option>
                </select>
              </div>
            </div>

            {/* Priority pills */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Приоритет
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'must_have' as Priority, label: 'Очень хочу', symbol: '●' },
                  { key: 'nice_to_have' as Priority, label: 'Хочется', symbol: '○' },
                  { key: 'dream' as Priority, label: 'Мечта', symbol: '◇' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriority(p.key)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      priority === p.key
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span className="text-[10px]">{p.symbol}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Ссылка на изображение
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={`${inputClass} flex-1 text-xs`}
                />
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Примечание / детали
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Размер, цвет, где лучше приобрести..."
                className={`${inputClass} text-xs`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Сохранить в вишлист</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
