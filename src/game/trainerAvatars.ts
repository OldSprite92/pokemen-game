/** 训练师头像选项 */
export const TRAINER_AVATARS: Record<string, { emoji: string; label: string; color: string }> = {
  boy1: { emoji: '👦', label: '男孩', color: '#3b82f6' },
  girl1: { emoji: '👧', label: '女孩', color: '#ec4899' },
  man1: { emoji: '👨', label: '爸爸', color: '#1e40af' },
  woman1: { emoji: '👩', label: '妈妈', color: '#be185d' },
  boy2: { emoji: '🧑‍🎤', label: '少年', color: '#8b5cf6' },
  girl2: { emoji: '👸', label: '公主', color: '#f472b6' },
  grandpa: { emoji: '👴', label: '爷爷', color: '#78716c' },
  grandma: { emoji: '👵', label: '奶奶', color: '#a8a29e' },
};

export function isCustomTrainerAvatar(avatar?: string) {
  return Boolean(avatar?.startsWith('data:image/'));
}

export function getTrainerAvatarOption(avatar?: string) {
  if (!avatar || isCustomTrainerAvatar(avatar)) return null;
  return TRAINER_AVATARS[avatar] || null;
}
