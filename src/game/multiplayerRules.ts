export type TeamActionTag = 'burst' | 'guard' | 'control' | 'support';

export function getTeamActionTag(element: string): TeamActionTag {
  if (['electric', 'poison', 'psychic', 'ice'].includes(element)) return 'control';
  if (['water', 'steel', 'rock', 'ground'].includes(element)) return 'guard';
  if (['grass', 'fairy', 'light'].includes(element)) return 'support';
  return 'burst';
}

/**
 * 联机 Boss 的基础数值。等级是主变量，人数只负责让共同挑战略微耐打。
 * 协作的默契目标是加分题，不再是唯一能造成有效伤害的门槛。
 */
export function getRaidRules(playerCount: number, monsterLevel: number = 5) {
  const partySize = Math.min(3, Math.max(2, playerCount));
  const level = Math.min(10, Math.max(1, monsterLevel));
  return {
    playerCount: partySize,
    bossHp: 45 + level * 16 + partySize * 24,
    teamHp: partySize * 100,
    requiredTags: partySize,
    enrageRound: partySize === 2 ? 7 : 6,
  };
}

export function getPvpTargetScore(playerCount: number) {
  return playerCount === 2 ? 2 : 3;
}

export const TEAM_TAG_LABELS: Record<TeamActionTag, string> = {
  burst: '爆发',
  guard: '守护',
  control: '控制',
  support: '援护',
};
