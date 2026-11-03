'use client';

import React, { useState, useRef } from 'react';
import { Wish, Priority } from '@/types';
import { scrapeLink, normalizeUrl } from '@/lib/scraper';
import { compressImage } from '@/lib/imageCompressor';
import {
  X,
  Sparkles,
  Loader2,
  Link2,
  Gift,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddWishModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
}

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 'must_have', label: 'Очень хочу', dot: 'bg-stone-900 dark:bg-stone-100' },
  { value: 'nice_to_have', label: 'Хочется', dot: 'bg-stone-400 dark:bg-stone-500' },
  { value: 'dream', label: 'Мечта', dot: 'bg-stone-300 dark:bg-stone-600' },
];

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
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!isOpen) return null;

  const executeScrape = async (targetUrl: string) => {
    const cleanUrl = normalizeUrl(targetUrl);
    if (!cleanUrl || !cleanUrl.startsWith('http')) return;

    setLoading(true);
    setImgError(false);
    try {
      const data = await scrapeLink(cleanUrl);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.image) {
        setImageUrl(data.image);
        setImageTab('url');
      }
      if (data.price) setPrice(String(data.price));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  // Handle URL change with auto-scraping
  const handleUrlChange = (val: string) => {
    setLinkUrl(val);
    const clean = normalizeUrl(val);

    if (scrapeTimeoutRef.current) {
      clearTimeout(scrapeTimeoutRef.current);
    }

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      scrapeTimeoutRef.current = setTimeout(() => {
        executeScrape(clean);
      }, 700);
    }
  };

  // Handle file upload from gallery with high-speed canvas compression (~60KB)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file, 960, 0.78);
      setImageUrl(compressedDataUrl);
      setImgError(false);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setCompressing(false);
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
    });

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#171717', '#78716c', '#d6d3d1'],
      });
    } catch {
      // noop
    }

    // Reset fields
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setImageUrl('');
    setPrice('');
    setPriority('nice_to_have');
    onClose();
  };

  const inputClass =
    'w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-100 focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full border-t sm:border border-stone-200/90 dark:border-stone-800 shadow-2xl p-5 sm:p-6 relative max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto -mt-1 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all cursor-pointer active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Новое желание
          </h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
            / добавьте подарок в ваш список
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link URL with auto-fill */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Ссылка на товар (Ozon, WB, Маркет...)
              </label>
              {loading && (
                <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Распознаём товар...
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Вставьте ссылку на товар..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <button
                type="button"
                onClick={() => executeScrape(linkUrl)}
                disabled={loading || !linkUrl.trim()}
                title="Заполнить название, цену и фото автоматически"
                className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 disabled:opacity-40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
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
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
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

          {/* Стоимость (Price) with ₽ symbol */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Стоимость
            </label>
            <div className="relative">
              <span className="font-mono text-stone-500 dark:text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs select-none">
                ₽
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="например: 3500"
                className={`${inputClass} pl-8 font-mono`}
              />
            </div>
          </div>

          {/* Image: Gallery upload or URL link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Изображение
              </label>

              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer active:scale-95 ${
                    imageTab === 'upload'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Из галереи
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer active:scale-95 ${
                    imageTab === 'url'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  По ссылке
                </button>
              </div>
            </div>

            {imageTab === 'upload' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 rounded-xl p-3.5 text-center cursor-pointer transition-all bg-stone-50/50 dark:bg-stone-800/40 active:scale-[0.99]"
                >
                  {compressing ? (
                    <div className="py-1">
                      <Loader2 className="w-5 h-5 mx-auto text-stone-500 animate-spin mb-1" />
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Оптимизация фото...
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mx-auto text-stone-400 mb-1" />
                      <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                        Нажмите, чтобы выбрать фото из галереи
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Быстрое сжатие для мгновенной загрузки
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImgError(false);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className={`${inputClass} pl-9`}
                />
              </div>
            )}

            {/* Thumbnail Preview if present */}
            {imageUrl && (
              <div className="mt-2.5 flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 animate-in fade-in duration-150">
                <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-700 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-600 flex items-center justify-center">
                  {!imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Preview"
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gift className="w-5 h-5 text-stone-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate block">
                    Фото прикреплено
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {imageUrl.startsWith('data:') ? 'Оптимизировано из галереи' : 'Ссылка на картинку'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  title="Удалить фото"
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
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
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xs font-semibold'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white dark:bg-stone-900' : p.dot
                      }`}
                    />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Примечание (размер, цвет, пожелания)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например: черный цвет, размер M..."
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Сохранить в вишлист</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
