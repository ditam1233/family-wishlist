'use client';

import React, { useState } from 'react';
import { Wish, Priority } from '@/types';
import { X, Sparkles, Loader2, Link2, Check, Image as ImageIcon } from 'lucide-react';
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
    } catch (err: unknown) {
      setScrapeError('Не удалось загрузить данные. Заполните вручную.');
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
    try { confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } }); } catch {}
    setUrl(''); setTitle(''); setDescription(''); setPrice(''); setImageUrl('');
    setPriority('nice_to_have'); setEventTag('Без повода');
    onClose();
  };

  const inputClass = 'w-full bg-cream border border-warm-200 rounded-2xl px-4 py-3 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl shadow-warm-900/10 border border-warm-200/60 relative max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 pb-4 border-b border-warm-100 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-warm-900">Новое желание</h2>
            <p className="text-xs text-warm-400 mt-0.5">Вставьте ссылку или заполните вручную</p>
          </div>
          <button onClick={onClose} className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-5 space-y-5">
          {/* URL + Scrape */}
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Ссылка на товар</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setScrapeError(null); }}
                placeholder="https://ozon.ru/product/..."
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={isLoading || !url}
                className="h-[46px] px-4 rounded-2xl bg-warm-800 hover:bg-warm-700 disabled:bg-warm-200 disabled:text-warm-400 text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden sm:inline">{isLoading ? 'Загрузка' : 'Заполнить'}</span>
              </button>
            </div>
            {scrapeError && (
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-xl mt-2 border border-amber-100">
                {scrapeError}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                Название <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Умная колонка Яндекс Станция"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Цена (₽)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5 000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Повод</label>
                <select value={eventTag} onChange={(e) => setEventTag(e.target.value)} className={inputClass}>
                  <option value="Без повода">Без повода</option>
                  <option value="День рождения">День рождения</option>
                  <option value="Новый год">Новый год</option>
                  <option value="Новоселье">Новоселье</option>
                  <option value="Годовщина">Годовщина</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Приоритет</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'must_have' as Priority, label: 'Очень хочу', dot: 'bg-red-400' },
                  { key: 'nice_to_have' as Priority, label: 'Было бы ок', dot: 'bg-amber-400' },
                  { key: 'dream' as Priority, label: 'Мечта', dot: 'bg-violet-400' },
                ]).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriority(p.key)}
                    className={`py-2.5 px-2 rounded-2xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      priority === p.key
                        ? 'bg-white border-warm-300 text-warm-800 shadow-sm'
                        : 'bg-cream border-warm-200/50 text-warm-400 hover:text-warm-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Картинка</label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ссылка на изображение"
                  className={`${inputClass} flex-1 text-xs`}
                />
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-warm-200 shrink-0" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">Комментарий</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Цвет, размер, важные детали..."
                className={`${inputClass} text-xs`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm shadow-md shadow-accent/15 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Сохранить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
