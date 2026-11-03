'use client';

import React from 'react';
import { User } from '@/types';
import { getInitials, getAvatarGradient } from '@/lib/avatar';

interface FamilyBarProps {
  members: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  currentUserId: string;
}

export const FamilyBar: React.FC<FamilyBarProps> = ({
  members,
  selectedUserId,
  onSelectUser,
  currentUserId,
}) => {
  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
      <div className="flex items-center gap-2.5 min-w-max">
        {members.map((member) => {
          const isSelected = member.id === selectedUserId;
          const isMe = member.id === currentUserId;
          const initials = getInitials(member.name);
          const gradient = getAvatarGradient(member.name);

          return (
            <button
              key={member.id}
              onClick={() => onSelectUser(member.id)}
              className={`flex items-center gap-3 py-2.5 px-4 rounded-2xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white shadow-md shadow-slate-200/60 border border-indigo-200 ring-2 ring-indigo-500/20 scale-[1.02]'
                  : 'bg-white/60 hover:bg-white border border-slate-200/70 hover:shadow-xs'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${
                  isSelected ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                }`}
              >
                {initials}
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold leading-tight ${
                      isSelected ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {member.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200/50">
                      вы
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">Вишлист</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
