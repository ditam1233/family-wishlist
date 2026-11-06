'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wish } from '@/types';
import { normalizeUrl, extractUrlAndTitle } from '@/lib/scraper';
import { compressImage } from '@/lib/imageCompressor';
import { Button, Input, TextArea, Tabs } from '@heroui/react';
import { X, Link as LinkIcon, Camera, Trash2, Loader2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddWishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
  userId: string;
}

export const AddWishModal: React.FC<AddWishModalProps> = ({
  isOpen,
  onClose,
  onAddWish,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');

  const [compressing, setCompressing] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setImageUrl('');
      setPrice('');
      setErrorMsg('');
      setCompressing(false);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUrlChange = (val: string) => {
    const { url: extractedUrl, extractedTitle } = extractUrlAndTitle(val);

    if (extractedUrl) {
      setLinkUrl(extractedUrl);
      if (!title.trim() && extractedTitle) {
        setTitle(extractedTitle);
      }
      return;
    }

    setLinkUrl(val);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file, 960, 0.78);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Пожалуйста, введите название подарка');
      return;
    }

    const cleanPrice = parseFloat(price.replace(/[^\d.]/g, ''));
    const finalCleanUrl = normalizeUrl(linkUrl);
    const validLink =
      finalCleanUrl.startsWith('http://') || finalCleanUrl.startsWith('https://')
        ? finalCleanUrl
        : undefined;

    onAddWish({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || undefined,
      link_url: validLink,
      image_url: imageUrl.trim() || undefined,
      price: !isNaN(cleanPrice) && cleanPrice > 0 ? cleanPrice : undefined,
      currency: '₽',
      priority: 'nice_to_have',
      event_tag: 'Без повода',
    });

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#10b981'],
      });
    } catch {
      /* noop */
    }

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="motion-dialog relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-[22px] bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Новое желание
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Link URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Ссылка на товар
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
              <LinkIcon className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Вставьте ссылку на товар или текст из магазина"
                value={linkUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText) {
                    const { url: extractedUrl, extractedTitle } = extractUrlAndTitle(pastedText);
                    if (extractedUrl) {
                      e.preventDefault();
                      setLinkUrl(extractedUrl);
                      if (!title.trim() && extractedTitle) {
                        setTitle(extractedTitle);
                      }
                    }
                  }
                }}
                className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Поддерживаются любые ссылки (включая сообщения из Ozon, Wildberries и др.)
            </p>
          </div>

          {/* Image Upload / URL Tabs via HeroUI Tabs */}
          <div className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Фотография
              </span>
              <Tabs
                selectedKey={imageTab}
                onSelectionChange={(key) => setImageTab(key as 'upload' | 'url')}
                className="w-auto"
              >
                <Tabs.ListContainer className="rounded-xl bg-stone-200/70 dark:bg-stone-800 p-0.5">
                  <Tabs.List aria-label="Источник фото" className="flex">
                    <Tabs.Tab
                      id="upload"
                      aria-label="Галерея / Камера"
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 transition-colors"
                    >
                      <span>Галерея / Камера</span>
                      <Tabs.Indicator className="rounded-lg bg-white dark:bg-stone-700 shadow-xs" />
                    </Tabs.Tab>
                    <Tabs.Tab
                      id="url"
                      aria-label="Ссылка"
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 transition-colors"
                    >
                      <span>Ссылка</span>
                      <Tabs.Indicator className="rounded-lg bg-white dark:bg-stone-700 shadow-xs" />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>

            {imageUrl ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-stone-200/70 dark:border-stone-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Предпросмотр" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : imageTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-6 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700/80 hover:bg-stone-100/50 dark:hover:bg-stone-800/40 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {compressing ? (
                  <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-7 h-7 text-stone-400 dark:text-stone-500" />
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                      Нажмите, чтобы выбрать фото
                    </span>
                  </>
                )}
              </div>
            ) : (
              <input
                type="text"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Название подарка <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="Например: Беспроводные наушники Sony"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            />
          </div>

          {/* Price Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Примерная стоимость
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
              <input
                type="text"
                placeholder="3500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
              />
              <span className="text-sm font-semibold text-stone-400">₽</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Заметки или пожелания
            </label>
            <TextArea
              rows={2}
              placeholder="Цвет черный, размер M, или артикул"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all resize-none overflow-x-hidden overflow-y-auto"
            />
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <Button
              type="submit"
              size="md"
              isDisabled={compressing}
              className="px-5 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all"
            >
              Добавить подарок
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
