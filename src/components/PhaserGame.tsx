import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from '../game/config';
import { BattleScene } from '../game/scenes/BattleScene';
import { MapScene } from '../game/scenes/MapScene';

interface PhaserGameProps {
  scene?: 'battle' | 'map';
}

export default function PhaserGame({ scene = 'battle' }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 如果已有游戏实例，先销毁
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const scenes = scene === 'battle' ? [BattleScene] : [MapScene];
    const config = createPhaserConfig(scenes, containerRef.current);

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [scene]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center items-center"
      style={{ minHeight: '400px' }}
    />
  );
}
