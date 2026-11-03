export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const GRADIENTS = [
  'from-rose-400 to-orange-300',
  'from-sky-400 to-indigo-400',
  'from-emerald-400 to-teal-400',
  'from-fuchsia-400 to-pink-400',
  'from-amber-400 to-orange-400',
  'from-violet-400 to-blue-400',
  'from-lime-400 to-emerald-400',
  'from-cyan-400 to-sky-400',
];

export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
