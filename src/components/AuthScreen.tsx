'use client';

import React, { useState } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { Gift, ArrowRight, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await dataStore.register(name, email, password);
        if (res.success && res.user) onSuccess(res.user);
        else setError(res.error || 'Ошибка регистрации');
      } else {
        const res = await dataStore.login(email, password);
        if (res.success && res.user) onSuccess(res.user);
        else setError(res.error || 'Неверный email или пароль');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Левая сторона — декоративная */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-warm-100 via-cream to-accent-light items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="relative z-10 text-center px-12 max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-lg shadow-warm-300/40 flex items-center justify-center mx-auto mb-8">
            <Gift className="w-10 h-10 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-semibold text-warm-800 tracking-tight leading-snug mb-4">
            Подарки, которые <br />действительно хотят
          </h2>
          <p className="text-warm-500 text-sm leading-relaxed">
            Создавайте списки желаний, делитесь ими с близкими. Никаких дубликатов, никаких испорченных сюрпризов.
          </p>
        </div>
      </div>

      {/* Правая сторона — форма */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Мобильный логотип */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-md shadow-warm-300/30 flex items-center justify-center">
              <Gift className="w-6 h-6 text-accent" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-semibold text-warm-800 tracking-tight">Вишлист</span>
          </div>

          <h1 className="text-2xl font-semibold text-warm-900 tracking-tight mb-1">
            {isRegister ? 'Создать аккаунт' : 'С возвращением'}
          </h1>
          <p className="text-sm text-warm-500 mb-8">
            {isRegister
              ? 'Зарегистрируйтесь, чтобы создать свой вишлист'
              : 'Войдите, чтобы открыть свой вишлист'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                  Ваше имя
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Степан"
                  className="w-full bg-white border border-warm-200 rounded-2xl px-4 py-3 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="stepan@mail.ru"
                className="w-full bg-white border border-warm-200 rounded-2xl px-4 py-3 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-warm-200 rounded-2xl px-4 py-3 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover disabled:bg-warm-300 text-white font-semibold text-sm shadow-lg shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Зарегистрироваться' : 'Войти'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-warm-500 hover:text-accent transition-colors cursor-pointer"
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
