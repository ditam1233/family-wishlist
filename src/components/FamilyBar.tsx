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
    <div className="w-full overflow-x-auto scrollbar-none -mx-1 px-1">
      <div className="flex items-center gap-2 min-w-max">
        {members.map((member) => {
          const isSelected = member.id === selectedUserId;
          const isMe = member.id === currentUserId;
          const initials = getInitials(member.name);
          const gradient = getAvatarGradient(member.name);

          return (
            <button
              key={member.id}
              onClick={() => onSelectUser(member.id)}
              className={`flex items-center gap-2.5 py-2 px-3 pr-4 rounded-2xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white shadow-md shadow-warm-300/25 border border-warm-200/80 scale-[1.02]'
                  : 'bg-transparent hover:bg-white/60 border border-transparent'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0`}
              >
                {initials}
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold leading-tight ${
                      isSelected ? 'text-warm-900' : 'text-warm-700'
                    }`}
                  >
                    {member.name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] font-bold bg-accent/10 text-accent px-1.5 py-px rounded-full">
                      вы
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
