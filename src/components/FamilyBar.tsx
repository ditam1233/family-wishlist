'use client';

import React from 'react';
import { User } from '@/types';
import { getInitials, getAvatarStyle } from '@/lib/avatar';

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
      <div className="flex items-center gap-2 min-w-max">
        {members.map((member) => {
          const isSelected = member.id === selectedUserId;
          const isMe = member.id === currentUserId;
          const initials = getInitials(member.name);
          const avatarStyle = getAvatarStyle(member.name);

          return (
            <button
              key={member.id}
              onClick={() => onSelectUser(member.id)}
              className={`flex items-center gap-2.5 py-1.5 px-3 rounded-full transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-100 border border-stone-200/80 text-stone-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                  isSelected
                    ? 'bg-stone-800 text-stone-200 border border-stone-700'
                    : `border ${avatarStyle}`
                }`}
              >
                {initials}
              </div>

              <span className="text-xs font-medium tracking-tight">
                {member.name}
              </span>

              {isMe && (
                <span
                  className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-stone-800 text-stone-300'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  вы
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
