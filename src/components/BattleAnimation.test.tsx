import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BattleAnimation } from './BattleAnimation';

describe('BattleAnimation', () => {
  it('shows the skill name and matching element effect for a successful hit', () => {
    render(
      <BattleAnimation
        visual={{
          attacker: 'player',
          element: 'electric',
          skillName: '雷霆尾巴',
          didHit: true,
          isCritical: false,
        }}
      />
    );

    expect(screen.getByLabelText('雷霆尾巴动画')).toBeInTheDocument();
    expect(screen.getByText('雷霆尾巴')).toBeInTheDocument();
    expect(screen.getAllByText('⚡')).toHaveLength(4);
  });

  it('shows a dodge callout when the skill misses', () => {
    render(
      <BattleAnimation
        visual={{
          attacker: 'enemy',
          element: 'poison',
          skillName: '毒雾球',
          didHit: false,
          isCritical: false,
        }}
      />
    );

    expect(screen.getByText('躲开了！')).toBeInTheDocument();
    expect(screen.getAllByText('☠️')).toHaveLength(4);
  });
});
