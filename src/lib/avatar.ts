export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Sophisticated, muted minimalist duotones with high legibility and refined tone
const AVATAR_PALETTES = [
  'bg-stone-900 text-stone-100 border-stone-800',
  'bg-zinc-800 text-zinc-100 border-zinc-700',
  'bg-neutral-900 text-neutral-100 border-neutral-800',
  'bg-slate-800 text-slate-100 border-slate-700',
  'bg-amber-950 text-amber-100 border-amber-900',
  'bg-stone-800 text-stone-100 border-stone-700',
  'bg-zinc-900 text-zinc-200 border-zinc-800',
  'bg-slate-900 text-slate-200 border-slate-800',
];

export function getAvatarStyle(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// Backward-compatible gradient export if needed anywhere
export function getAvatarGradient(name: string): string {
  return getAvatarStyle(name);
}
