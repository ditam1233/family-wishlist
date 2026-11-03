'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { X, Sparkles, Loader2, Check, Image as ImageIcon } from 'lucide-react';
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
      setScrapeError('Не удалось подгрузить данные с сайта. Заполните вручную.');
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
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
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
    'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl shadow-slate-900/10 border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md p-6 pb-4 border-b border-slate-100 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Новое желание</h2>
            <p className="text-xs text-slate-500 mt-0.5">Вставьте ссылку на товар или заполните вручную</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-5 space-y-5">
          {/* URL + Scrape */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
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
                placeholder="https://ozon.ru/product/..."
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={isLoading || !url}
                className="h-[46px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                )}
                <span className="hidden sm:inline">{isLoading ? 'Загрузка...' : 'Авто-заполнение'}</span>
              </button>
            </div>
            {scrapeError && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl mt-2 border border-amber-200">
                {scrapeError}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Название подарка <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Умная колонка, духи, книга..."
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                  Примерная цена (₽)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5 000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Приоритет
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'must_have' as Priority, label: 'Очень хочу', icon: '🔥', activeBg: 'bg-rose-50 border-rose-300 text-rose-700' },
                  { key: 'nice_to_have' as Priority, label: 'Было бы ок', icon: '⭐', activeBg: 'bg-amber-50 border-amber-300 text-amber-700' },
                  { key: 'dream' as Priority, label: 'Мечта', icon: '✨', activeBg: 'bg-violet-50 border-violet-300 text-violet-700' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriority(p.key)}
                    className={`py-2.5 px-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      priority === p.key
                        ? `${p.activeBg} shadow-xs scale-[1.02]`
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Ссылка на картинку
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
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Комментарий или детали
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Размер, цвет, где лучше купить..."
                className={`${inputClass} text-xs`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить в вишлист</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
