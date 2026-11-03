'use client';

import React, { useState } from 'react';
import { Gift, Sparkles, Lock, Moon, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Gift,
    badge: '1 из 4',
    title: 'Все желания семьи в одном месте',
    description:
      'Создайте семейный круг и пригласите близких по коду. Больше никаких одинаковых подарков и вопросов «что подарить?».',
    accent: 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900',
  },
  {
    icon: Sparkles,
    badge: '2 из 4',
    title: 'Умное автозаполнение и фото',
    description:
      'Просто вставьте ссылку на Ozon, Wildberries или любой магазин — сайт сам заполнит название, цену и фото. Либо выберите фотографию прямо из галереи телефона.',
    accent: 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900',
  },
  {
    icon: Lock,
    badge: '3 из 4',
    title: 'Секретная бронь (Анти-спойлер)',
    description:
      'Нажмите «Подарю я» на желании родственника. Именинник ни о чём не догадается, а остальные члены семьи увидят статус «Занято».',
    accent: 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900',
  },
  {
    icon: Moon,
    badge: '4 из 4',
    title: 'Тёмная тема и комфорт',
    description:
      'Переключайте светлую и тёмную тему в любое время кнопкой в шапке для удобного просмотра ночью.',
    accent: 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('wishlist_onboarding_done', 'true');
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#171717', '#78716c', '#d6d3d1'],
      });
    } catch {
      /* noop */
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full border border-stone-200/90 dark:border-stone-800 shadow-2xl p-6 relative overflow-hidden text-center animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Badge */}
        <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 mb-4">
          {step.badge}
        </div>

        {/* Animated Slide Content */}
        <div key={currentStep} className="animate-in fade-in zoom-in-95 duration-200">
          {/* Icon Circle */}
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm transition-transform duration-300 ${step.accent}`}
          >
            <Icon className="w-7 h-7 stroke-[1.75]" />
          </div>

          {/* Step Content */}
          <h3 className="text-base font-bold text-stone-950 dark:text-stone-50 tracking-tight mb-2">
            {step.title}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-6 min-h-[56px]">
            {step.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? 'w-6 bg-stone-900 dark:bg-stone-100'
                  : 'w-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-400'
              }`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="py-2.5 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                <span>Понятно, начать!</span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </>
            ) : (
              <>
                <span>Далее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
