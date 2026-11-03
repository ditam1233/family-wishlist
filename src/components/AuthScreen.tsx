'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { getAvatarStyle, getInitials } from '@/lib/avatar';
import { Gift, ArrowRight, Loader2, KeyRound, Lock, Mail, User as UserIcon, Check } from 'lucide-react';

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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200/90 shadow-xl p-6 sm:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center mx-auto mb-3">
            <Gift className="w-5 h-5 stroke-[1.75]" />
          </div>
          <h1 className="text-lg font-semibold text-stone-900 tracking-tight font-mono uppercase">
            Family Wishlist
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Списки желаний и секретное бронирование
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'code'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-900'
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
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'admin'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Email / Пароль
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Mode: Code */}
        {mode === 'code' ? (
          <div>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
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
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono font-bold tracking-wider text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all uppercase placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Found family hint */}
              {foundFamily && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-stone-900 font-medium">
                    <Check className="w-3.5 h-3.5 text-stone-900 stroke-[2.5]" />
                    <span>Семья: «{foundFamily.name}»</span>
                  </div>

                  {familyMembers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200/60">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                        Нажмите на своё имя для входа:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {familyMembers.map((m) => {
                          const avatarStyle = getAvatarStyle(m.name);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={loading}
                              onClick={() => handleQuickMemberLogin(m.name)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-stone-200 hover:border-stone-900 text-stone-800 text-xs font-medium transition-all cursor-pointer"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border ${avatarStyle} flex items-center justify-center text-[8px] font-mono font-bold`}
                              >
                                {getInitials(m.name)}
                              </div>
                              <span>{m.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                  {foundFamily && familyMembers.length > 0
                    ? 'Или укажите новое имя'
                    : 'Ваше имя'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={relativeName}
                    onChange={(e) => setRelativeName(e.target.value)}
                    placeholder="Например: Мама или Степан"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
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
          /* Mode: Email / Password */
          <div>
            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                    Имя
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Степан"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
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
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isRegister ? 'Зарегистрироваться' : 'Войти'}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
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
