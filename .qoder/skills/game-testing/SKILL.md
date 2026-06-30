---
name: game-testing
description: 为儿童宝可梦冒险游戏项目提供专业的游戏测试策略和测试用例生成。使用当用户提到游戏测试、测试用例、功能测试、bug修复验证、游戏平衡性测试、或需要验证游戏功能时。
---

# 游戏测试 Skill

## 项目背景

这是一个面向儿童的宝可梦冒险游戏，技术栈：
- React 19 + TypeScript + Vite
- Phaser 4 游戏引擎
- Tailwind CSS 4
- Dexie (IndexedDB) 本地存储
- Vitest + Testing Library 测试框架
- Capacitor 8 移动端打包

游戏核心功能：
- 宝可梦创造（选择属性、技能、头像）
- 大陆冒险地图（格子系统）
- 野外遇敌与战斗系统
- 图鉴收集与管理
- 训练师系统
- 多人联机对战

## 测试策略

### 1. 单元测试（Vitest）

**优先测试的核心模块：**
- 游戏状态管理（zustand store）
- 战斗逻辑计算（伤害公式、命中率）
- 数据持久化（Dexie CRUD 操作）
- 工具函数（数值计算、随机生成）

**测试文件命名规范：**
```
__tests__/utils/battle-logic.test.ts
__tests__/stores/gameStore.test.ts
__tests__/db/database.test.ts
```

**关键测试场景：**
- 战斗伤害计算是否正确
- 经验值升级逻辑
- 精灵球捕获率计算
- 技能效果触发条件
- 数据库存储和读取

### 2. 组件测试（Testing Library）

**需要测试的 React 组件：**
- CreatePage（创造流程）
- PokedexPage（图鉴功能）
- BattlePage（战斗界面）
- AdventurePage（冒险地图）

**测试重点：**
- 用户交互（点击、输入、选择）
- 状态变化后的 UI 更新
- 路由跳转
- 错误边界处理

### 3. 集成测试

**关键用户流程：**
1. 创造宝可梦 → 查看图鉴 → 开始冒险
2. 冒险遇敌 → 进入战斗 → 捕获/击败
3. 训练师创建 → 选择出战宝可梦 → 联机对战

### 4. 游戏平衡性测试

**需要验证的数值：**
- 各属性宝可梦的强度是否平衡
- 技能伤害与消耗是否合理
- 升级经验曲线是否合适
- 捕获率是否公平
- 道具掉落概率

## 测试用例模板

### 战斗系统测试用例

```typescript
describe('战斗系统', () => {
  it('伤害计算应考虑属性相克', () => {
    // 火属性攻击草属性应造成额外伤害
  });
  
  it('技能命中率应受速度差影响', () => {
    // 速度快的一方命中率更高
  });
  
  it('击败敌方应获得经验值', () => {
    // 验证经验值增加和升级逻辑
  });
  
  it('HP归零应结束战斗', () => {
    // 验证战斗结束条件
  });
});
```

### 图鉴系统测试用例

```typescript
describe('图鉴系统', () => {
  it('点击卡片应显示详情弹窗', () => {
    // 验证弹窗显示和关闭
  });
  
  it('遭遇记录应正确显示', () => {
    // 验证遭遇数据渲染
  });
  
  it('技能管理应能添加/删除技能', () => {
    // 验证技能操作
  });
});
```

## 测试数据准备

**Mock 数据工厂：**

```typescript
// 创建测试用宝可梦
export const createMockMonster = (overrides?: Partial<Monster>): Monster => ({
  id: 1,
  name: '测试宝可梦',
  element: 'fire',
  skills: [createMockSkill()],
  avatar: 'avatar1',
  hp: 100,
  maxHp: 100,
  attack: 50,
  defense: 40,
  speed: 60,
  level: 5,
  exp: 0,
  expToNext: 100,
  createdBy: 'user',
  createdAt: new Date(),
  ...overrides,
});

// 创建测试用技能
export const createMockSkill = (overrides?: Partial<Skill>): Skill => ({
  id: 'skill-1',
  name: '测试技能',
  element: 'fire',
  power: 50,
  accuracy: 90,
  description: '这是一个测试技能',
  ...overrides,
});
```

## 常见 Bug 模式

根据项目历史，重点关注：

1. **Tree Shaking 问题**：Vite 生产构建可能移除条件渲染的代码
2. **IndexedDB 数据丢失**：版本升级时数据迁移
3. **Phaser 场景切换**：内存泄漏和状态同步
4. **移动端适配**：触摸事件和屏幕尺寸
5. **联机同步**：Socket.io 连接状态和数据一致性

## 测试执行命令

```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npx vitest run src/__tests__/battle-logic.test.ts

# 开发模式监听
npm run test:watch

# 生成测试覆盖率报告
npx vitest run --coverage
```

## 性能测试建议

- 使用 Chrome DevTools 的 Performance 面板
- 监控 Phaser 场景的 FPS
- 检查 IndexedDB 查询性能
- 验证大列表（图鉴）的渲染性能
- 测试移动端电池消耗
