import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GymBadgeEmblem, SuperBadgeEmblem } from './GymBadgeEmblem';
import type { ElementType } from '../types';

describe('GymBadgeEmblem', () => {
  it('uses a local SVG image asset for every element instead of an emoji or CSS-drawn silhouette', () => {
    const elements: ElementType[] = [
      'fire', 'water', 'grass', 'electric', 'normal', 'ice', 'fighting', 'poison', 'ground', 'flying',
      'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'light',
    ];
    const { container } = render(<>{elements.map((element) => <GymBadgeEmblem key={element} element={element} />)}</>);

    const emblems = screen.getAllByRole('img');
    expect(emblems).toHaveLength(19);
    expect(container.querySelectorAll('.gym-badge-emblem svg')).toHaveLength(19);
    expect(new Set(Array.from(container.querySelectorAll('.gym-badge-emblem svg')).map((svg) => svg.innerHTML)).size).toBe(19);
    expect(screen.getByRole('img', { name: '毒属性徽章' }).textContent).not.toContain('☠️');
  });

  it('renders the super badge from its local SVG image asset', () => {
    render(<SuperBadgeEmblem />);
    expect(screen.getByRole('img', { name: '超级勋章' }).querySelector('svg')).not.toBeNull();
  });
});
