import { ELEMENT_CONFIG } from './create/StepElement';
import type { CSSProperties } from 'react';
import type { ElementType } from '../types';
import bugArtwork from '../assets/gym-badges/bug.svg?raw';
import darkArtwork from '../assets/gym-badges/dark.svg?raw';
import dragonArtwork from '../assets/gym-badges/dragon.svg?raw';
import electricArtwork from '../assets/gym-badges/electric.svg?raw';
import fairyArtwork from '../assets/gym-badges/fairy.svg?raw';
import fightingArtwork from '../assets/gym-badges/fighting.svg?raw';
import fireArtwork from '../assets/gym-badges/fire.svg?raw';
import flyingArtwork from '../assets/gym-badges/flying.svg?raw';
import ghostArtwork from '../assets/gym-badges/ghost.svg?raw';
import grassArtwork from '../assets/gym-badges/grass.svg?raw';
import groundArtwork from '../assets/gym-badges/ground.svg?raw';
import iceArtwork from '../assets/gym-badges/ice.svg?raw';
import lightArtwork from '../assets/gym-badges/light.svg?raw';
import normalArtwork from '../assets/gym-badges/normal.svg?raw';
import poisonArtwork from '../assets/gym-badges/poison.svg?raw';
import psychicArtwork from '../assets/gym-badges/psychic.svg?raw';
import rockArtwork from '../assets/gym-badges/rock.svg?raw';
import steelArtwork from '../assets/gym-badges/steel.svg?raw';
import superArtwork from '../assets/gym-badges/super.svg?raw';
import waterArtwork from '../assets/gym-badges/water.svg?raw';

// These are checked-in image assets. The component only supplies accessible labels,
// color and sizing; it never draws badge silhouettes with CSS.
const GYM_BADGE_ARTWORK: Record<ElementType, string> = {
  fire: fireArtwork,
  water: waterArtwork,
  grass: grassArtwork,
  electric: electricArtwork,
  normal: normalArtwork,
  ice: iceArtwork,
  fighting: fightingArtwork,
  poison: poisonArtwork,
  ground: groundArtwork,
  flying: flyingArtwork,
  psychic: psychicArtwork,
  bug: bugArtwork,
  rock: rockArtwork,
  ghost: ghostArtwork,
  dragon: dragonArtwork,
  dark: darkArtwork,
  steel: steelArtwork,
  fairy: fairyArtwork,
  light: lightArtwork,
};

type EmblemProps = {
  className?: string;
  size?: string;
};

export function GymBadgeEmblem({ element, className = '', size = '3rem' }: EmblemProps & { element: ElementType }) {
  const config = ELEMENT_CONFIG[element];
  return (
    <span
      aria-label={`${config.label}属性徽章`}
      className={`gym-badge-emblem ${className}`}
      role="img"
      style={{ '--badge-color': config.color, color: config.color, height: size, width: size } as CSSProperties}
      title={`${config.label}属性徽章`}
      // Artwork is imported from local, versioned SVG files rather than user content.
      dangerouslySetInnerHTML={{ __html: GYM_BADGE_ARTWORK[element] }}
    />
  );
}

export function SuperBadgeEmblem({ className = '', size = '3rem' }: EmblemProps) {
  return (
    <span
      aria-label="超级勋章"
      className={`super-badge-emblem ${className}`}
      role="img"
      style={{ height: size, width: size }}
      title="超级勋章"
      // Artwork is imported from a local, versioned SVG file rather than user content.
      dangerouslySetInnerHTML={{ __html: superArtwork }}
    />
  );
}
