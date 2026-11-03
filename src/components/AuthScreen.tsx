'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { getAvatarGradient, getInitials } from '@/lib/avatar';
import { Gift, ArrowRight, Loader2, KeyRound, Lock, Mail, User as UserIcon, Check, Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  // Режим: 'code' (для родственников) или 'admin' (для создателей с email/паролем)
  const [mode, setMode] = useState<'code' | 'admin'>('code');

  // Поля для входа по коду
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [foundFamily, setFoundFamily] = useState<{ name: string; id: string } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);

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

  // Проверка семьи и загрузка участников при вводе кода
  useEffect(() => {
    const checkFamily = async () => {
      const clean = inviteCode.trim();
      if (clean.length >= 4) {
        try {
          const info = await dataStore.getFamilyInfoByCode(clean);
          if (info.group) {
            setFoundFamily({ name: info.group.name, id: info.group.id });
            setFamilyMembers(info.members);
          } else {
            setFoundFamily(null);
            setFamilyMembers([]);
          }
        } catch {
          setFoundFamily(null);
          setFamilyMembers([]);
        }
      } else {
        setFoundFamily(null);
        setFamilyMembers([]);
      }
    };
    checkFamily();
  }, [inviteCode]);

  // Быстрый вход по нажатию на своё имя
  const handleQuickMemberLogin = async (memberName: string) => {
    setRelativeName(memberName);
    setError(null);
    setLoading(true);

    try {
      const res = await dataStore.joinByCode(inviteCode, memberName);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Не удалось войти');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/60 p-6 sm:p-8 relative z-10">
        {/* App Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Gift className="w-7 h-7" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Family Wishlist
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Секретные бронирования подарков без дубликатов
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'code'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Вход по коду семьи
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Организатор
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Mode 1: Code Login */}
        {mode === 'code' ? (
          <div>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                  Код приглашения
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Например: ФЭМ-3031"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-base font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Family info & members */}
              {foundFamily && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs text-indigo-900 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Семья найдена: «{foundFamily.name}»</span>
                  </div>

                  {familyMembers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-indigo-200/50">
                      <p className="text-[11px] text-slate-600 mb-2 font-medium">
                        Уже есть в этой семье? Нажмите на имя:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {familyMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickMemberLogin(m.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-800 text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                m.name
                              )} flex items-center justify-center text-white text-[9px] font-bold`}
                            >
                              {getInitials(m.name)}
                            </div>
                            <span>{m.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                  {foundFamily && familyMembers.length > 0
                    ? 'Или введите своё имя:'
                    : 'Как вас зовут?'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={relativeName}
                    onChange={(e) => setRelativeName(e.target.value)}
                    placeholder="Например: Мама, Папа Саша, Бабушка..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
          </div>
        ) : (
          /* Mode 2: Organizer (Email / Password) */
          <div>
            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 ml-0.5">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Степан"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-0.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-0.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{isRegister ? 'Зарегистрироваться' : 'Войти'}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  {isRegister
                    ? 'Уже есть аккаунт? Войти'
                    : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
