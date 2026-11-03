'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { Gift, ArrowRight, Loader2, KeyRound, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  // Режим: 'code' (для родственников) или 'admin' (для создателей с email/паролем)
  const [mode, setMode] = useState<'code' | 'admin'>('code');

  // Поля для входа по коду
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');

  // Поля для создателей (Email / Пароль)
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Автозаполнение кода из ссылки: ?code=СТЕ-1234
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('code');
      if (codeFromUrl) {
        setInviteCode(codeFromUrl.toUpperCase());
        setMode('code');
      }
    }
  }, []);

  // Вход по коду приглашения (для родных)
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await dataStore.joinByCode(inviteCode, relativeName);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Не удалось войти по коду');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Вход / Регистрация по Email (для создателей)
  const handleAdminSubmit = async (e: React.FormEvent) => {
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
      {/* Левая декоративная часть */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-warm-100 via-cream to-accent-light items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="relative z-10 text-center px-12 max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-lg shadow-warm-300/40 flex items-center justify-center mx-auto mb-8">
            <Gift className="w-10 h-10 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-semibold text-warm-800 tracking-tight leading-snug mb-4">
            Семейный Вишлист
          </h2>
          <p className="text-warm-500 text-sm leading-relaxed">
            Подарки для всей семьи без дубликатов и с сохранением сюрприза.
          </p>
        </div>
      </div>

      {/* Правая часть с формой */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Мобильный логотип */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-md shadow-warm-300/30 flex items-center justify-center">
              <Gift className="w-6 h-6 text-accent" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-semibold text-warm-800 tracking-tight">
              Семейный Вишлист
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* ======================================================== */}
          {/* РЕЖИМ 1: Вход по коду семьи (для родственников)        */}
          {/* ======================================================== */}
          {mode === 'code' ? (
            <div>
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-3">
                  <KeyRound className="w-3.5 h-3.5" />
                  Вход для членов семьи
                </div>
                <h1 className="text-2xl font-semibold text-warm-900 tracking-tight mb-1">
                  Присоединиться к семье
                </h1>
                <p className="text-xs text-warm-500 leading-relaxed">
                  Введите код семьи, который вам прислали, и напишите, как вас зовут. Пароль не требуется!
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-warm-700 mb-1.5 ml-0.5">
                    Код семьи
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Например: СТЕ-4821"
                    className="w-full bg-white border border-warm-200 rounded-2xl px-4 py-3.5 text-base font-mono font-semibold tracking-wider text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-warm-300 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-700 mb-1.5 ml-0.5">
                    Как вас зовут?
                  </label>
                  <input
                    type="text"
                    required
                    value={relativeName}
                    onChange={(e) => setRelativeName(e.target.value)}
                    placeholder="Например: Мама Лена или Папа Саша"
                    className="w-full bg-white border border-warm-200 rounded-2xl px-4 py-3.5 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-4 px-4 rounded-2xl bg-accent hover:bg-accent-hover disabled:bg-warm-300 text-white font-semibold text-sm shadow-lg shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Войти в семью</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-warm-200/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('admin');
                    setError(null);
                  }}
                  className="text-xs text-warm-500 hover:text-accent font-medium transition-colors cursor-pointer"
                >
                  Вы создатель? Войти по Email и паролю →
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* РЕЖИМ 2: Вход / Регистрация по Email (для создателей)    */
            /* ======================================================== */
            <div>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('code');
                    setError(null);
                  }}
                  className="text-xs text-accent hover:underline mb-3 inline-block font-medium"
                >
                  ← Назад к входу по коду семьи
                </button>
                <h1 className="text-2xl font-semibold text-warm-900 tracking-tight mb-1">
                  {isRegister ? 'Регистрация создателя' : 'Вход для создателя'}
                </h1>
                <p className="text-xs text-warm-500">
                  {isRegister
                    ? 'Создайте аккаунт, чтобы управлять семьями'
                    : 'Войдите со своим email и паролем'}
                </p>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
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
          )}
        </div>
      </div>
    </div>
  );
};
