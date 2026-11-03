'use client';

import React, { useState, useEffect } from 'react';
import { User, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { X, Users, Copy, Check, Plus, Hash, Share2, Loader2, Sparkles } from 'lucide-react';

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
    const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
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
    'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400';

  const tabBtnClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
      active
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Семейные круги</h2>
            <p className="text-[11px] text-slate-500">Управляйте группами и делитесь ссылками</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
          <button
            onClick={() => {
              setTab('list');
              setError(null);
            }}
            className={tabBtnClass(tab === 'list')}
          >
            Мои ({userGroups.length})
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
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {tab === 'list' && (
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
            {userGroups.length > 0 ? (
              userGroups.map((group) => {
                const isActive = selectedGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200/70 hover:border-slate-300'
                    } flex items-center justify-between gap-3`}
                  >
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        if (onSelectGroup) {
                          onSelectGroup(group.id);
                          onClose();
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-slate-900">{group.name}</h3>
                        {isActive && (
                          <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Активна
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>Код:</span>
                        <code className="font-mono text-indigo-600 font-bold">{group.invite_code}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectGroup && !isActive && (
                        <button
                          onClick={() => {
                            onSelectGroup(group.id);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Выбрать
                        </button>
                      )}

                      <button
                        onClick={() => handleShareLink(group.invite_code)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-indigo-200/50"
                        title="Скопировать готовую ссылку с кодом для WhatsApp"
                      >
                        {copiedLink === group.invite_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Ссылка</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyCode(group.invite_code)}
                        className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs transition-all cursor-pointer"
                        title="Скопировать только код"
                      >
                        {copiedCode === group.invite_code ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                У вас пока нет семейных групп.<br />Создайте семью, чтобы получить код.
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Название семьи
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Например: Семья Степана или Семья Арины"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать семью'}
            </button>
          </form>
        )}

        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                Код приглашения
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Например: ФЭМ-3031"
                className={`${inputClass} uppercase font-mono tracking-wider`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Вступить в семью'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
