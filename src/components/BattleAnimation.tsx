import type { ElementType } from '../types';

export interface BattleVisualState {
  attacker: 'player' | 'enemy';
  element: ElementType;
  skillName: string;
  didHit: boolean;
  isCritical: boolean;
}

const ELEMENT_EFFECTS: Record<ElementType, { icon: string; label: string }> = {
  fire: { icon: '🔥', label: '火焰冲击' },
  water: { icon: '💧', label: '水流冲击' },
  grass: { icon: '🌿', label: '藤蔓突袭' },
  electric: { icon: '⚡', label: '闪电穿梭' },
  normal: { icon: '💥', label: '力量冲击' },
  ice: { icon: '❄️', label: '冰晶飞射' },
  fighting: { icon: '🥊', label: '拳风突击' },
  poison: { icon: '☠️', label: '毒雾扩散' },
  ground: { icon: '🪨', label: '岩石翻滚' },
  flying: { icon: '💨', label: '疾风俯冲' },
  psychic: { icon: '🔮', label: '念力波动' },
  bug: { icon: '✨', label: '虫群闪击' },
  rock: { icon: '🪨', label: '碎岩坠落' },
  ghost: { icon: '👻', label: '幽影穿梭' },
  dragon: { icon: '🐉', label: '龙息冲锋' },
  dark: { icon: '🌑', label: '暗影突袭' },
  steel: { icon: '⚙️', label: '钢铁撞击' },
  fairy: { icon: '🌟', label: '星光魔法' },
  light: { icon: '☀️', label: '光芒爆发' },
};

export function BattleAnimation({ visual }: { visual: BattleVisualState | null }) {
  if (!visual) return null;

  const effect = ELEMENT_EFFECTS[visual.element];
  const directionClass = visual.attacker === 'player' ? 'is-player-attack' : 'is-enemy-attack';

  return (
    <div className="battle-effect-layer" aria-live="polite" aria-label={`${visual.skillName}动画`}>
      <div className={`battle-skill-callout ${directionClass}`}>
        {visual.isCritical ? '会心一击！' : visual.didHit ? visual.skillName : '躲开了！'}
      </div>
      <div className={`battle-skill-effect effect-${visual.element} ${directionClass} ${visual.didHit ? 'is-hit' : 'is-miss'}`}>
        <span className="battle-skill-spark spark-one">{effect.icon}</span>
        <span className="battle-skill-spark spark-two">{effect.icon}</span>
        <span className="battle-skill-spark spark-three">{effect.icon}</span>
        <span className="battle-skill-core">{effect.icon}</span>
      </div>
      <span className="sr-only">{effect.label}</span>
    </div>
  );
}
