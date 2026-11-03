'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { getAvatarStyle, getInitials } from '@/lib/avatar';
import { getStoredTheme, applyTheme, Theme } from '@/lib/theme';
import {
  Gift,
  ArrowRight,
  Loader2,
  KeyRound,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'code' | 'admin'>('code');

  // Fields for family invite code
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [foundFamily, setFoundFamily] = useState<{ name: string; id: string } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);

  // Fields for email/password
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  // Initialize theme
  useEffect(() => {
    const t = getStoredTheme();
    setCurrentTheme(t);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Auto-fill code from URL: ?code=STE-1234
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

  // Check family by code
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

  // Handle Code-based Quick Access
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !relativeName.trim()) {
      setError('Заполните код семьи и ваше имя');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.joinByCode(
        inviteCode.trim(),
        relativeName.trim()
      );
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Неверный код приглашения или ошибка входа');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Existing Member Tap
  const handleSelectExistingMember = async (member: User) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.joinByCode(inviteCode.trim(), member.name);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Не удалось войти');
      }
    } catch {
      setError('Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Введите имя');
          setLoading(false);
          return;
        }
        const res = await dataStore.register(email, password, name);
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

  const inputClass =
    'w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-3 text-base sm:text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-100 focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xl p-6 sm:p-8 relative">
        {/* Theme toggle */}
        <button
          onClick={handleToggleTheme}
          title="Сменить тему"
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-stone-600" />
          )}
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Gift className="w-5 h-5 stroke-[1.75]" />
          </div>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight font-mono uppercase">
            Family Wishlist
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Списки желаний и секретное бронирование
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'code'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            По коду семьи
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'admin'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Email / Пароль
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Mode: Code */}
        {mode === 'code' ? (
          <div>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Код приглашения
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="СТЕ-4821"
                    className={`${inputClass} pl-9 font-mono font-bold tracking-wider uppercase placeholder:font-sans placeholder:font-normal`}
                  />
                </div>
              </div>

              {/* Found family hint */}
              {foundFamily && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-stone-900 dark:text-stone-100 font-medium">
                    <Check className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100 stroke-[2.5]" />
                    <span>Семья: «{foundFamily.name}»</span>
                  </div>

                  {familyMembers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                      <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">
                        Или выберите свой профиль:
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {familyMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectExistingMember(m)}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-700/60 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <div
                              className={`w-5 h-5 rounded-full border ${getAvatarStyle(
                                m.name
                              )} flex items-center justify-center text-[9px] font-mono font-bold`}
                            >
                              {getInitials(m.name)}
                            </div>
                            <span className="text-xs text-stone-800 dark:text-stone-200">
                              Это я ({m.name})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Ваше имя в семье
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={relativeName}
                    onChange={(e) => setRelativeName(e.target.value)}
                    placeholder="Мама, Папа, Катя..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Войти в семью</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Mode: Admin Email */
          <div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Александр"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@family.ru"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isRegister ? 'Зарегистрироваться' : 'Войти'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
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
