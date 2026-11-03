'use client';

import React, { useState, useEffect } from 'react';
import { User, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { X, Users, Copy, Check, Share2, Loader2, Hash } from 'lucide-react';

interface FamilyGroupModalProps {
  isOpen: boolean;
  currentUser: User;
  selectedGroupId?: string;
  onSelectGroup?: (id: string) => void;
  onClose: () => void;
  onUpdate: () => void;
}

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({
  isOpen,
  currentUser,
  selectedGroupId,
  onSelectGroup,
  onClose,
  onUpdate,
}) => {
  const [tab, setTab] = useState<'list' | 'create' | 'join'>('list');
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen, currentUser.id]);

  const loadGroups = async () => {
    const groups = await dataStore.getUserGroups(currentUser.id);
    setUserGroups(groups);
  };

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleShareLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname =
      typeof window !== 'undefined'
        ? window.location.pathname.replace(/\/$/, '')
        : '';
    const shareUrl = `${origin}${pathname}/?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await dataStore.createGroup(
        newGroupName.trim(),
        currentUser.id
      );
      if (res.success && res.group) {
        setNewGroupName('');
        await loadGroups();
        if (onSelectGroup) onSelectGroup(res.group.id);
        onUpdate();
        setTab('list');
      } else {
        setError(res.error || 'Не удалось создать группу');
      }
    } catch {
      setError('Ошибка при создании группы');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await dataStore.joinGroup(
        inviteCode.trim(),
        currentUser.id
      );
      if (res.success && res.group) {
        setInviteCode('');
        await loadGroups();
        if (onSelectGroup) onSelectGroup(res.group.id);
        onUpdate();
        setTab('list');
      } else {
        setError(res.error || 'Неверный код приглашения');
      }
    } catch {
      setError('Не удалось вступить в группу');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:border-stone-900 dark:focus:border-stone-100 focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 transition-all placeholder:text-stone-400 dark:placeholder:text-stone-500';

  const tabBtnClass = (active: boolean) =>
    `flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
      active
        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs'
        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl max-w-md w-full border-t sm:border border-stone-200/90 dark:border-stone-800 shadow-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto -mt-1 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Семейные круги
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              / группы и коды приглашений
            </p>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl mb-4">
          <button
            onClick={() => {
              setTab('list');
              setError(null);
            }}
            className={tabBtnClass(tab === 'list')}
          >
            Круги ({userGroups.length})
          </button>
          <button
            onClick={() => {
              setTab('create');
              setError(null);
            }}
            className={tabBtnClass(tab === 'create')}
          >
            Создать
          </button>
          <button
            onClick={() => {
              setTab('join');
              setError(null);
            }}
            className={tabBtnClass(tab === 'join')}
          >
            По коду
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {tab === 'list' && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {userGroups.length > 0 ? (
              userGroups.map((group) => {
                const isActive = selectedGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-stone-50 dark:bg-stone-800/60 border-stone-900 dark:border-stone-100'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                    } flex items-center justify-between gap-3`}
                  >
                    <div
                      className="cursor-pointer flex-1 min-w-0"
                      onClick={() => {
                        if (onSelectGroup) {
                          onSelectGroup(group.id);
                          onClose();
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                          {group.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono uppercase px-1.5 py-0.2 rounded shrink-0">
                            Активен
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                        <Hash className="w-3 h-3 text-stone-400" />
                        <code className="text-stone-900 dark:text-stone-100 font-semibold">
                          {group.invite_code}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectGroup && !isActive && (
                        <button
                          onClick={() => {
                            onSelectGroup(group.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                        >
                          Выбрать
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyCode(group.invite_code)}
                        title="Скопировать код"
                        className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedCode === group.invite_code ? (
                          <Check className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleShareLink(group.invite_code)}
                        title="Скопировать ссылку для родственников"
                        className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedLink === group.invite_code ? (
                          <Check className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-stone-400 text-xs">
                У вас пока нет групп
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Название круга
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Семья Ивановых"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newGroupName.trim()}
              className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-40 text-white dark:text-stone-900 font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Создать круг'
              )}
            </button>
          </form>
        )}

        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Код приглашения
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Например: СТЕМ-1234"
                className={`${inputClass} uppercase font-mono tracking-wider`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-40 text-white dark:text-stone-900 font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Присоединиться'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
