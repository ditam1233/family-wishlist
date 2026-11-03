'use client';

import React, { useState, useEffect } from 'react';
import { User, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { X, Users, Copy, Check, Plus, Hash, Share2, Loader2 } from 'lucide-react';

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
    'w-full bg-cream border border-warm-200 rounded-2xl px-4 py-3 text-sm text-warm-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-warm-300';

  const tabBtnClass = (active: boolean) =>
    `flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
      active
        ? 'bg-white text-warm-800 shadow-sm'
        : 'text-warm-400 hover:text-warm-600'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl shadow-warm-900/10 border border-warm-200/60 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-warm-900">Семейные круги</h2>
            <p className="text-[11px] text-warm-400">Управляйте группами и делитесь ссылками</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-cream p-1 rounded-2xl border border-warm-200/60 mb-5">
          <button onClick={() => { setTab('list'); setError(null); }} className={tabBtnClass(tab === 'list')}>
            Мои ({userGroups.length})
          </button>
          <button onClick={() => { setTab('create'); setError(null); }} className={tabBtnClass(tab === 'create')}>
            Создать
          </button>
          <button onClick={() => { setTab('join'); setError(null); }} className={tabBtnClass(tab === 'join')}>
            По коду
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {tab === 'list' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {userGroups.length > 0 ? (
              userGroups.map((group) => {
                const isActive = selectedGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-warm-100/70 border-warm-300 shadow-xs'
                        : 'bg-cream border-warm-200/60 hover:border-warm-300'
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
                        <h3 className="font-semibold text-sm text-warm-800">{group.name}</h3>
                        {isActive && (
                          <span className="text-[10px] bg-warm-900 text-white font-semibold px-2 py-0.5 rounded-full">
                            Активна
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-warm-500">
                        <Hash className="w-3 h-3 text-warm-400" />
                        <span>Код:</span>
                        <code className="font-mono text-accent font-semibold">{group.invite_code}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectGroup && !isActive && (
                        <button
                          onClick={() => {
                            onSelectGroup(group.id);
                            onClose();
                          }}
                          className="px-2.5 py-2 rounded-xl bg-warm-200/60 hover:bg-warm-200 text-warm-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Выбрать
                        </button>
                      )}
                    <button
                      onClick={() => handleShareLink(group.invite_code)}
                      className="px-2.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Скопировать готовую ссылку с кодом для WhatsApp"
                    >
                      {copiedLink === group.invite_code ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Ссылка скопирована!</span>
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
                      className="p-2 rounded-xl bg-white border border-warm-200/80 text-warm-400 hover:text-warm-700 shadow-xs transition-all cursor-pointer"
                      title="Скопировать только код"
                    >
                      {copiedCode === group.invite_code ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
            ) : (
              <div className="text-center py-8 text-warm-400 text-xs">
                У вас пока нет семейных групп.<br />Создайте семью, чтобы получить код.
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                Название семьи
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Например: Семья Степана"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover disabled:bg-warm-300 text-white font-semibold text-xs shadow-sm shadow-accent/15 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Создать семью и получить код</span>
            </button>
          </form>
        )}

        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1.5 ml-0.5">
                Код приглашения
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="СЕМ-4821"
                className={`${inputClass} font-mono tracking-widest uppercase text-center`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-warm-800 hover:bg-warm-700 disabled:bg-warm-300 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Присоединиться</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
