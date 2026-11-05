'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { getInitials } from '@/lib/avatar';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import { Button } from '@heroui/react';
import {
  Gift,
  Key,
  Mail,
  Lock,
  User as UserIcon,
  Sun,
  Moon,
  ArrowRight,
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { mode, toggleColorMode } = useColorMode();
  const [tab, setTab] = useState<'code' | 'email'>('code');

  // Code auth
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [foundFamily, setFoundFamily] = useState<{ name: string; id: string } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [isCheckingFamily, setIsCheckingFamily] = useState(false);
  const [isNewMemberMode, setIsNewMemberMode] = useState(false);

  // Email auth
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
        setTab('code');
      }
    }
  }, []);

  // Check family members by code on typing (debounced)
  useEffect(() => {
    const clean = inviteCode.trim();
    if (clean.length < 4) {
      setFoundFamily(null);
      setFamilyMembers([]);
      setIsNewMemberMode(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingFamily(true);
      try {
        const info = await dataStore.getFamilyInfoByCode(clean);
        if (info.group) {
          setFoundFamily({ name: info.group.name, id: info.group.id });
          setFamilyMembers(info.members);
          if (info.members.length === 0) {
            setIsNewMemberMode(true);
          }
        } else {
          setFoundFamily(null);
          setFamilyMembers([]);
        }
      } catch {
        setFoundFamily(null);
        setFamilyMembers([]);
      } finally {
        setIsCheckingFamily(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  // Click on existing member in the list
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
      setError('Не удалось войти в аккаунт');
    } finally {
      setLoading(false);
    }
  };

  // Submit code with custom name (new relative)
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !relativeName.trim()) {
      setError('Пожалуйста, введите код семьи и ваше имя');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await dataStore.joinByCode(inviteCode.trim(), relativeName.trim());
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Семья с таким кодом не найдена. Проверьте код и попробуйте снова.');
      }
    } catch {
      setError('Не удалось подключиться к семье. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Submit email auth
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = isRegister
        ? await dataStore.register(email.trim(), password, name.trim())
        : await dataStore.login(email.trim(), password);

      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || (isRegister ? 'Не удалось зарегистрироваться.' : 'Неверная почта или пароль.'));
      }
    } catch {
      setError('Ошибка авторизации. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 relative">
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleColorMode}
        title="Сменить тему"
        className="fixed top-4 right-4 p-2.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-colors cursor-pointer z-10"
      >
        {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Main Container */}
      <div className="w-full max-w-md space-y-6">
        {/* App Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Gift className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Семейный Вишлист
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Делитесь подарками и радуйте близких
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="flex border-b border-stone-100 dark:border-stone-800 p-1.5 bg-stone-50/60 dark:bg-stone-900/60">
            <button
              type="button"
              onClick={() => { setTab('code'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                tab === 'code'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>По коду семьи</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('email'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                tab === 'email'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {tab === 'code' ? (
              <div className="space-y-4">
                {/* Invite Code Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Код семьи
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all font-mono">
                    <Key className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="АБВ-1234"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 uppercase tracking-widest placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                    />
                    {isCheckingFamily && (
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                    )}
                  </div>
                </div>

                {/* Found Family Banner */}
                {foundFamily && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-stone-500 dark:text-stone-400 text-[10px]">
                        Семья найдена
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {foundFamily.name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Family Members Selection */}
                {foundFamily && familyMembers.length > 0 && !isNewMemberMode && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      Выберите себя из списка:
                    </span>

                    <div className="space-y-1.5">
                      {familyMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          disabled={loading}
                          onClick={() => handleSelectExistingMember(member)}
                          className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                {member.name}
                              </div>
                              <div className="text-[11px] text-stone-400">
                                Нажмите, чтобы войти в профиль
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </button>
                      ))}
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsNewMemberMode(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Меня нет в списке (Создать новый профиль)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Name Input (for new members or if toggled) */}
                {(!foundFamily || familyMembers.length === 0 || isNewMemberMode) && (
                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Ваше имя, чтобы близкие узнавали вас
                      </label>
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                        <UserIcon className="w-4 h-4 text-stone-400 shrink-0" />
                        <input
                          type="text"
                          required
                          placeholder="Например: Мама или Алексей"
                          value={relativeName}
                          onChange={(e) => setRelativeName(e.target.value)}
                          className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="md"
                      isDisabled={loading || !inviteCode.trim() || !relativeName.trim()}
                      className="w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all gap-2 h-11"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      <span>Присоединиться к семье</span>
                    </Button>

                    {foundFamily && familyMembers.length > 0 && (
                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setIsNewMemberMode(false)}
                          className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                        >
                          ← Вернуться к выбору из списка
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            ) : (
              /* TAB 2: EMAIL AUTH */
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Ваше имя
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                      <UserIcon className="w-4 h-4 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder="Например: Анна"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Почта
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Пароль
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="md"
                  isDisabled={loading}
                  className="w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all gap-2 h-11"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{isRegister ? 'Зарегистрироваться' : 'Войти'}</span>
                </Button>

                <div className="pt-2 text-center border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isRegister
                      ? 'Уже есть аккаунт? Войти'
                      : 'Нет аккаунта? Зарегистрироваться'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
