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

    const res = await dataStore.createGroup(newGroupName.trim(), currentUser.id);
    setLoading(false);
    if (res.success && res.group) {
      setNewGroupName('');
      setTab('list');
      await loadGroups();
      onUpdate();
    } else {
      setError(res.error || 'Не удалось создать группу');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inviteCode.trim()) return;
    setLoading(true);

    const res = await dataStore.joinGroup(inviteCode.trim(), currentUser.id);
    setLoading(false);
    if (res.success) {
      setInviteCode('');
      setTab('list');
      await loadGroups();
      onUpdate();
    } else {
      setError(res.error || 'Не удалось присоединиться');
    }
  };

  const inputClass =
    'w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all placeholder:text-stone-400';

  const tabBtnClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
      active
        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
        : 'text-stone-500 hover:text-stone-900'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full border-t sm:border border-stone-200/90 shadow-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto -mt-1 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900 tracking-tight">
              Семейные круги
            </h2>
            <p className="text-[11px] text-stone-500 font-mono">
              / группы и коды приглашений
            </p>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
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
          <div className="mb-4 p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-xs text-center font-medium">
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
                        ? 'bg-stone-50 border-stone-900'
                        : 'bg-white border-stone-200 hover:border-stone-300'
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
                        <span className="font-medium text-xs text-stone-900 truncate">
                          {group.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-stone-900 text-white font-mono uppercase px-1.5 py-0.2 rounded shrink-0">
                            Активен
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500 font-mono">
                        <Hash className="w-3 h-3 text-stone-400" />
                        <code className="text-stone-900 font-semibold">
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
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all cursor-pointer"
                        >
                          Выбрать
                        </button>
                      )}

                      <button
                        onClick={() => handleShareLink(group.invite_code)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        title="Скопировать ссылку для отправки близким"
                      >
                        {copiedLink === group.invite_code ? (
                          <>
                            <Check className="w-3 h-3 text-stone-900 stroke-[2.5]" />
                            <span className="hidden sm:inline">Готово</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3 text-stone-500" />
                            <span className="hidden sm:inline">Ссылка</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyCode(group.invite_code)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-all cursor-pointer"
                        title="Скопировать только код"
                      >
                        {copiedCode === group.invite_code ? (
                          <Check className="w-3.5 h-3.5 text-stone-900 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-stone-400 text-xs">
                У вас пока нет семейных групп.
                <br />
                Создайте первую семью, чтобы получить код.
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Название круга
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Например: Семья Ивановых"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
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
          <form onSubmit={handleJoin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                Код приглашения
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="СТЕ-4821"
                className={`${inputClass} uppercase font-mono tracking-wider`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Вступить в круг'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
