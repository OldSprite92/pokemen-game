import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    // 战斗场景背景
    this.cameras.main.setBackgroundColor('#2d1b69');

    const { width, height } = this.scale;

    // 占位文字
    const text = this.add.text(width / 2, height / 2, '⚔️ 对战场景 ⚔️', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    const subText = this.add.text(width / 2, height / 2 + 40, '即将展开激烈对决！', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    subText.setOrigin(0.5);
  }

  update() {
    // TODO: 战斗逻辑
  }
}
