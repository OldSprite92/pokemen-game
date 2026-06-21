import type { Monster, PokeBallType, PokeBallConfig } from '../types';

/** 精灵球配置表 */
export const POKEBALL_CONFIG: Record<PokeBallType, PokeBallConfig> = {
  normal: {
    type: 'normal',
    name: '普通球',
    emoji: '🔴',
    color: '#ef4444',
    catchRateMultiplier: 1.0,
  },
  great: {
    type: 'great',
    name: '高级球',
    emoji: '🔵',
    color: '#3b82f6',
    catchRateMultiplier: 1.5,
  },
  ultra: {
    type: 'ultra',
    name: '超级球',
    emoji: '🟡',
    color: '#eab308',
    catchRateMultiplier: 2.0,
  },
  master: {
    type: 'master',
    name: '大师球',
    emoji: '🟣',
    color: '#a855f7',
    catchRateMultiplier: 3.0,
  },
  legend: {
    type: 'legend',
    name: '传奇球',
    emoji: '⭐',
    color: '#f59e0b',
    catchRateMultiplier: 4.0,
  },
  transcend: {
    type: 'transcend',
    name: '超限球',
    emoji: '💎',
    color: '#06b6d4',
    catchRateMultiplier: 5.0,
  },
};

/** 基础捕获率 */
const BASE_CATCH_RATE = 0.3;

/** 计算血量系数
 * 满血时系数最低(0.5)，空血时最高(1.0)
 */
function calculateHpFactor(currentHp: number, maxHp: number): number {
  const hpPercent = currentHp / maxHp;
  return 0.5 + (1 - hpPercent) * 0.5;
}

/** 计算捕获率
 * @returns 0~1 之间的捕获概率
 */
export function calculateCatchRate(
  enemy: Monster,
  ballType: PokeBallType,
  currentHp: number
): number {
  const hpFactor = calculateHpFactor(currentHp, enemy.maxHp || enemy.hp);
  const ballMultiplier = POKEBALL_CONFIG[ballType].catchRateMultiplier;
  const randomFactor = 0.85 + Math.random() * 0.3; // 0.85 ~ 1.15

  let catchRate = BASE_CATCH_RATE * hpFactor * ballMultiplier * randomFactor;

  // 上限95%，永远不是100%
  return Math.min(0.95, catchRate);
}

/** 尝试捕获
 * @returns 是否捕获成功
 */
export function tryCatch(enemy: Monster, ballType: PokeBallType, currentHp: number): boolean {
  const catchRate = calculateCatchRate(enemy, ballType, currentHp);
  const roll = Math.random();
  return roll < catchRate;
}

/** 生成捕获结果描述 */
export function getCatchResultText(success: boolean, enemyName: string): string {
  if (success) {
    const texts = [
      `太棒了！${enemyName}被捕获了！`,
      `成功！${enemyName}加入了你的队伍！`,
      `捕获成功！${enemyName}成为你的伙伴！`,
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  } else {
    const texts = [
      `可惜！${enemyName}挣脱了精灵球！`,
      `差一点！${enemyName}逃走了！`,
      `${enemyName}打破了精灵球！再试一次吧！`,
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  }
}

/** 生成捕获概率提示文本 */
export function getCatchRateHint(catchRate: number): string {
  if (catchRate >= 0.7) return '捕获率: 很高 🔥';
  if (catchRate >= 0.5) return '捕获率: 较高 ✨';
  if (catchRate >= 0.3) return '捕获率: 一般 🤔';
  if (catchRate >= 0.15) return '捕获率: 较低 😰';
  return '捕获率: 很低 💦';
}
