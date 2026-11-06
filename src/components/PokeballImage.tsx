import type { ImgHTMLAttributes } from 'react';
import type { PokeBallType } from '../types';
import normalBall from '../assets/pokeballs/normal.png';
import greatBall from '../assets/pokeballs/great.png';
import ultraBall from '../assets/pokeballs/ultra.png';
import masterBall from '../assets/pokeballs/master.png';
import legendBall from '../assets/pokeballs/legend.png';
import transcendBall from '../assets/pokeballs/transcend.png';

export const POKEBALL_ARTWORK: Record<PokeBallType, string> = {
  normal: normalBall,
  great: greatBall,
  ultra: ultraBall,
  master: masterBall,
  legend: legendBall,
  transcend: transcendBall,
};

interface PokeballImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  type: PokeBallType;
}

export default function PokeballImage({ type, alt, className = '', ...props }: PokeballImageProps) {
  return (
    <img
      {...props}
      src={POKEBALL_ARTWORK[type]}
      alt={alt ?? ''}
      className={`pokeball-artwork ${className}`}
      draggable={false}
    />
  );
}
