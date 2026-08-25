import { ELEMENT_CONFIG } from './create/StepElement';
import { getMonsterElements } from '../game/monsterElements';
import type { Monster } from '../types';

interface MonsterElementBadgesProps {
  monster: Pick<Monster, 'element' | 'elements'>;
  className?: string;
  badgeClassName?: string;
}

/** 在任何宝可梦资料卡中一致地展示其全部属性。 */
export default function MonsterElementBadges({
  monster,
  className = 'flex flex-wrap items-center gap-1',
  badgeClassName = 'text-xs px-2 py-0.5 rounded-lg font-bold',
}: MonsterElementBadgesProps) {
  return (
    <div className={className} aria-label="宝可梦属性">
      {getMonsterElements(monster).map((element) => {
        const config = ELEMENT_CONFIG[element];
        return (
          <span
            key={element}
            className={badgeClassName}
            style={{ backgroundColor: config.color + '30', color: config.color }}
          >
            {config.emoji} {config.label}
          </span>
        );
      })}
    </div>
  );
}
