import Phaser from 'phaser';

/** Phaser 基础配置 - 像素风渲染 */
export function createPhaserConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
  parent: string | HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 360,
    height: 640,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scene: scenes,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
