'use client';

import React, { useState, useEffect } from 'react';
import { User, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { Button, Chip, Input, Tabs } from '@heroui/react';
import {
  Users,
  Plus,
  Key,
  Copy,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen, currentUser.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loadGroups = async () => {
    const groups = await dataStore.getUserGroups(currentUser.id);
    setUserGroups(groups);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.createGroup(newGroupName.trim(), currentUser.id);
      if (res.success && res.group) {
        setNewGroupName('');
        await loadGroups();
        onUpdate();
        if (onSelectGroup) onSelectGroup(res.group.id);
        setTab('list');
      } else {
        setError(res.error || 'Не удалось создать семью.');
      }
    } catch {
      setError('Не удалось создать семью. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.joinGroup(inviteCode.trim(), currentUser.id);
      if (res.success && res.group) {
        setInviteCode('');
        await loadGroups();
        onUpdate();
        if (onSelectGroup) onSelectGroup(res.group.id);
        setTab('list');
      } else {
        setError(res.error || 'Неверный код или ошибка подключения.');
      }
    } catch {
      setError('Неверный код или ошибка подключения.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Семейные круги
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher via HeroUI Tabs */}
        <div className="px-6 pt-3">
          <Tabs
            selectedKey={tab}
            onSelectionChange={(key) => {
              setTab(key as 'list' | 'create' | 'join');
              setError(null);
            }}
            className="w-full"
          >
            <Tabs.ListContainer className="w-full rounded-2xl bg-stone-100 dark:bg-stone-800 p-1">
              <Tabs.List aria-label="Вкладки семейных групп" className="w-full flex">
                <Tabs.Tab
                  id="list"
                  aria-label="Мои семьи"
                  className="flex-1 py-1.5 text-xs font-semibold rounded-xl text-center text-stone-600 dark:text-stone-300 transition-colors"
                >
                  <span>Мои семьи ({userGroups.length})</span>
                  <Tabs.Indicator className="rounded-xl bg-white dark:bg-stone-700 shadow-xs" />
                </Tabs.Tab>
                <Tabs.Tab
                  id="create"
                  aria-label="Создать"
                  className="flex-1 py-1.5 text-xs font-semibold rounded-xl text-center text-stone-600 dark:text-stone-300 transition-colors"
                >
                  <span>Создать</span>
                  <Tabs.Indicator className="rounded-xl bg-white dark:bg-stone-700 shadow-xs" />
                </Tabs.Tab>
                <Tabs.Tab
                  id="join"
                  aria-label="Войти по коду"
                  className="flex-1 py-1.5 text-xs font-semibold rounded-xl text-center text-stone-600 dark:text-stone-300 transition-colors"
                >
                  <span>Войти по коду</span>
                  <Tabs.Indicator className="rounded-xl bg-white dark:bg-stone-700 shadow-xs" />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: LIST */}
          {tab === 'list' && (
            <div className="space-y-2">
              {userGroups.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  Вы пока не состоите ни в одном кругу.
                </div>
              ) : (
                userGroups.map((group) => {
                  const isSelected = group.id === selectedGroupId;
                  const isCopied = copiedCode === group.invite_code;
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        if (onSelectGroup) onSelectGroup(group.id);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {group.name}
                          </span>
                          {isSelected && (
                            <Chip className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white border-0">
                              Текущая
                            </Chip>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-400 font-mono">
                          <Key className="w-3 h-3 text-stone-400" />
                          <span>Код: {group.invite_code}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Скопировать код приглашения"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(group.invite_code);
                        }}
                        className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: CREATE */}
          {tab === 'create' && (
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Название нового круга
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Например: Семья Ивановых или Друзья"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                />
              </div>

              <Button
                type="submit"
                size="md"
                isDisabled={loading || !newGroupName.trim()}
                className="w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all gap-2 h-11"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Создать круг</span>
              </Button>
            </form>
          )}

          {/* TAB 3: JOIN */}
          {tab === 'join' && (
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Код приглашения (8 символов)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all font-mono">
                  <Key className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="WISH-XXXX"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 uppercase tracking-widest placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  Попросите создателя круга скопировать код в разделе «Мои семьи»
                </p>
              </div>

              <Button
                type="submit"
                size="md"
                isDisabled={loading || !inviteCode.trim()}
                className="w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 transition-all gap-2 h-11"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                <span>Присоединиться к семье</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
