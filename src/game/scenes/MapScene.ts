import Phaser from 'phaser';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    // 地图场景背景
    this.cameras.main.setBackgroundColor('#1b4332');

    const { width, height } = this.scale;

    // 占位网格（模拟地图）
    const gridSize = 32;
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2d6a4f, 0.5);

    for (let x = 0; x < width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }

    // 占位文字
    const text = this.add.text(width / 2, height / 2, '🗺️ 冒险地图 🗺️', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    const subText = this.add.text(width / 2, height / 2 + 40, '探索未知的大陆！', {
      fontSize: '14px',
      color: '#b7e4c7',
      fontFamily: 'monospace',
    });
    subText.setOrigin(0.5);
  }

  update() {
    // TODO: 地图逻辑
  }
}
