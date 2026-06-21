import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../db/database';
import { POKEBALL_CONFIG, tryCatch, getCatchResultText, getCatchRateHint, calculateCatchRate } from '../game/catchSystem';
import { generateBattleReward, applyExp, generateRewardText } from '../game/rewardSystem';
import type { PokeBallType, Monster } from '../types';

export default function BattlePage() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDamage, setShowDamage] = useState<{ value: number; side: 'player' | 'enemy' } | null>(null);
  const [showCatch, setShowCatch] = useState(false);
  const [catchResult, setCatchResult] = useState<{ success: boolean; text: string } | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [rewardTexts, setRewardTexts] = useState<string[]>([]);
  const [inventory, setInventory] = useState<Record<PokeBallType, number>>({
    normal: 3, great: 1, ultra: 0, master: 0, legend: 0, transcend: 0,
  });
  const isAnimatingRef = useRef(false);

  const extendedBattleState = useGameStore((state) => state.extendedBattleState);
  const executePlayerTurn = useGameStore((state) => state.executePlayerTurn);
  const executeEnemyTurn = useGameStore((state) => state.executeEnemyTurn);
  const checkBattleEnd = useGameStore((state) => state.checkBattleEnd);
  const endBattleExtended = useGameStore((state) => state.endBattleExtended);
  const switchPlayerMonster = useGameStore((state) => state.switchPlayerMonster);

  const { playerMonster, enemyMonster, playerCurrentHp, enemyCurrentHp, turn, isOver, winner, log, playerTeam, activePlayerIndex } = extendedBattleState;

  // 加载背包
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    // 简化：从localStorage或默认值加载
    const saved = localStorage.getItem('pokeballs');
    if (saved) {
      setInventory(JSON.parse(saved));
    }
  };

  const saveInventory = (inv: Record<PokeBallType, number>) => {
    localStorage.setItem('pokeballs', JSON.stringify(inv));
    setInventory(inv);
  };

  // 如果没有战斗数据，返回主页
  useEffect(() => {
    if (!playerMonster || !enemyMonster) {
      navigate('/');
    }
  }, [playerMonster, enemyMonster, navigate]);

  // 敌人先手时自动执行敌人回合
  useEffect(() => {
    if (turn === 'enemy' && !isOver && !isAnimatingRef.current && !showCatch && !showReward) {
      isAnimatingRef.current = true;
      setIsAnimating(true);
      const timer = setTimeout(() => {
        const enemyResult = executeEnemyTurn();
        if (enemyResult && enemyResult.damageResult.damage > 0) {
          setShowDamage({ value: enemyResult.damageResult.damage, side: 'player' });
          setTimeout(() => setShowDamage(null), 800);
        }
        checkBattleEnd();
        isAnimatingRef.current = false;
        setIsAnimating(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, isOver, executeEnemyTurn, checkBattleEnd, showCatch, showReward]);

  if (!playerMonster || !enemyMonster) return null;

  const playerMaxHp = playerMonster.maxHp || playerMonster.hp;
  const enemyMaxHp = enemyMonster.maxHp || enemyMonster.hp;
  const playerHpPercent = Math.max(0, (playerCurrentHp / playerMaxHp) * 100);
  const enemyHpPercent = Math.max(0, (enemyCurrentHp / enemyMaxHp) * 100);

  const playerAvatar = AVATAR_OPTIONS.find((a) => a.id === playerMonster.avatar);
  const enemyAvatar = AVATAR_OPTIONS.find((a) => a.id === enemyMonster.avatar);
  const playerElement = ELEMENT_CONFIG[playerMonster.element];
  const enemyElement = ELEMENT_CONFIG[enemyMonster.element];

  const handleSkillClick = useCallback(async (skillIndex: number) => {
    if (isAnimating || isOver || turn !== 'player') return;

    setIsAnimating(true);

    const result = executePlayerTurn(skillIndex);
    if (result && result.damageResult.damage > 0) {
      setShowDamage({ value: result.damageResult.damage, side: 'enemy' });
      setTimeout(() => setShowDamage(null), 800);
    }

    const ended = checkBattleEnd();
    if (ended) {
      handleBattleEnd();
      return;
    }

    setTimeout(() => {
      const enemyResult = executeEnemyTurn();
      if (enemyResult && enemyResult.damageResult.damage > 0) {
        setShowDamage({ value: enemyResult.damageResult.damage, side: 'player' });
        setTimeout(() => setShowDamage(null), 800);
      }
      checkBattleEnd();
      setIsAnimating(false);
      isAnimatingRef.current = false;
    }, 1500);
  }, [isAnimating, isOver, turn, executePlayerTurn, executeEnemyTurn, checkBattleEnd]);

  const handleBattleEnd = () => {
    const state = useGameStore.getState().extendedBattleState;
    if (state.winner === 'player' && enemyMonster) {
      // 生成奖励
      const reward = generateBattleReward(enemyMonster);
      const texts = generateRewardText(reward);

      // 应用经验值
      if (playerMonster) {
        const { monster: updatedMonster, leveledUp } = applyExp(playerMonster, reward.exp);
        // 保存更新后的宝可梦
        if (playerMonster.id) {
          db.monsters.update(playerMonster.id, {
            level: updatedMonster.level,
            exp: updatedMonster.exp,
            expToNext: updatedMonster.expToNext,
            maxHp: updatedMonster.maxHp,
            hp: updatedMonster.hp,
            attack: updatedMonster.attack,
            defense: updatedMonster.defense,
            speed: updatedMonster.speed,
          } as any);
        }
        if (leveledUp) {
          texts.push(`${updatedMonster.name} 升级了！现在是 ${updatedMonster.level} 级！`);
        }
      }

      // 添加精灵球到背包
      const newInventory = { ...inventory };
      reward.pokeballs.forEach((drop) => {
        newInventory[drop.type] = (newInventory[drop.type] || 0) + drop.count;
      });
      saveInventory(newInventory);

      setRewardTexts(texts);
      setShowReward(true);
    }
    setIsAnimating(false);
    isAnimatingRef.current = false;
  };

  const handleCatch = (ballType: PokeBallType) => {
    if (isAnimating || isOver || turn !== 'player') return;
    if (inventory[ballType] <= 0) return;

    // 消耗精灵球
    const newInventory = { ...inventory };
    newInventory[ballType]--;
    saveInventory(newInventory);

    setShowCatch(false);
    setIsAnimating(true);
    isAnimatingRef.current = true;

    // 捕获动画延迟
    setTimeout(() => {
      const success = tryCatch(enemyMonster, ballType, enemyCurrentHp);
      const text = getCatchResultText(success, enemyMonster.name);
      setCatchResult({ success, text });

      if (success) {
        // 捕获成功，保存野生宝可梦
        const caughtMonster: Monster = {
          ...enemyMonster,
          id: undefined,
          createdBy: 'user',
          createdAt: new Date(),
          hp: enemyMonster.maxHp || enemyMonster.hp,
        };
        db.monsters.add(caughtMonster).then((id) => {
          // 关联到训练师
          const trainer = useGameStore.getState().currentTrainer;
          if (trainer && trainer.id) {
            db.trainers.update(trainer.id, {
              monsterIds: [...trainer.monsterIds, id as number],
            });
          }
        });

        // 结束战斗
        useGameStore.setState((s: any) => ({
          extendedBattleState: {
            ...s.extendedBattleState,
            isOver: true,
            winner: 'player',
            log: [...s.extendedBattleState.log, text],
          },
        }));
      } else {
        // 捕获失败，继续战斗（敌人回合）
        setTimeout(() => {
          setCatchResult(null);
          const enemyResult = executeEnemyTurn();
          if (enemyResult && enemyResult.damageResult.damage > 0) {
            setShowDamage({ value: enemyResult.damageResult.damage, side: 'player' });
            setTimeout(() => setShowDamage(null), 800);
          }
          checkBattleEnd();
          setIsAnimating(false);
          isAnimatingRef.current = false;
        }, 2000);
      }
    }, 1500);
  };

  const handleEndBattle = () => {
    endBattleExtended();
    navigate('/');
  };

  const hpBarColor = (percent: number) => {
    if (percent > 60) return '#22c55e';
    if (percent > 30) return '#eab308';
    return '#ef4444';
  };

  // 计算捕获率提示
  const getCatchHint = (ballType: PokeBallType): string => {
    const rate = calculateCatchRate(enemyMonster, ballType, enemyCurrentHp);
    return getCatchRateHint(rate);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <button onClick={handleEndBattle} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 逃跑
        </button>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">⚔️ 对战</h1>
        <div className="w-12" />
      </div>

      {/* 战斗区域 */}
      <div className="flex-1 flex flex-col gap-6">
        {/* 敌方宝可梦 */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl relative" style={{ backgroundColor: enemyAvatar?.bg || '#1f2937' }}>
            {enemyAvatar?.emoji || '❓'}
            {showDamage?.side === 'enemy' && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-lg animate-bounce">
                -{showDamage.value}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-white">{enemyMonster.name}</span>
              <span className="text-sm" style={{ color: enemyElement?.color }}>
                {enemyElement?.emoji} Lv.{enemyMonster.level}
              </span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${enemyHpPercent}%`, backgroundColor: hpBarColor(enemyHpPercent) }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{enemyCurrentHp} / {enemyMaxHp} HP</p>
          </div>
        </div>

        {/* 战斗播报 */}
        <div className="pixel-border rounded-xl p-4 bg-gray-800/70 min-h-[120px] max-h-[160px] overflow-y-auto">
          {log.slice(-5).map((entry, i) => (
            <p key={i} className={`text-sm mb-1 ${i === log.slice(-5).length - 1 ? 'text-yellow-200 font-bold' : 'text-gray-300'}`}>
              {entry}
            </p>
          ))}
          {catchResult && (
            <p className={`text-sm font-bold ${catchResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {catchResult.text}
            </p>
          )}
        </div>

        {/* 我方宝可梦 */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl relative" style={{ backgroundColor: playerAvatar?.bg || '#1f2937' }}>
            {playerAvatar?.emoji || '❓'}
            {showDamage?.side === 'player' && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-lg animate-bounce">
                -{showDamage.value}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-white">{playerMonster.name}</span>
              <span className="text-sm" style={{ color: playerElement?.color }}>
                {playerElement?.emoji} Lv.{playerMonster.level}
              </span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${playerHpPercent}%`, backgroundColor: hpBarColor(playerHpPercent) }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{playerCurrentHp} / {playerMaxHp} HP</p>
          </div>
        </div>

        {/* 战斗结束界面 */}
        {isOver ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl">{winner === 'player' ? '🎉' : '😢'}</div>
            <p className="text-xl font-bold text-yellow-300">
              {winner === 'player' ? '战斗胜利！' : '战斗失败...'}
            </p>
            <button onClick={handleEndBattle} className="bg-yellow-500 text-gray-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-yellow-400 active:scale-95 transition-all shadow-lg">
              {winner === 'player' ? '继续冒险 →' : '返回休息 →'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-gray-400">
              {turn === 'player' ? '你的回合！' : '敌人回合...'}
            </p>

            {/* 技能按钮 */}
            <div className="grid grid-cols-2 gap-3">
              {playerMonster.skills.map((skill, index) => {
                const skillElement = ELEMENT_CONFIG[skill.element];
                const isDisabled = isAnimating || turn !== 'player';
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleSkillClick(index)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center gap-1 p-4 rounded-xl transition-all duration-200 active:scale-95 ${
                      isDisabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50' : 'bg-gray-700 text-white hover:bg-gray-600 shadow-lg'
                    }`}
                  >
                    <span className="text-lg font-bold">{skillElement?.emoji} {skill.name}</span>
                    <span className="text-xs text-gray-400">威力 {skill.power} | 命中 {skill.accuracy}%</span>
                  </button>
                );
              })}
            </div>

            {/* 捕获按钮 */}
            {turn === 'player' && !isAnimating && (
              <button
                onClick={() => setShowCatch(true)}
                className="bg-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-pink-400 active:scale-95 transition-all shadow-lg"
              >
                🔴 投掷精灵球
              </button>
            )}

            {/* 替换按钮 */}
            {turn === 'player' && !isAnimating && playerTeam.length > 1 && (
              <button
                onClick={() => setShowSwitch(true)}
                className="bg-blue-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-400 active:scale-95 transition-all shadow-lg"
              >
                🔄 替换宝可梦
              </button>
            )}
          </div>
        )}
      </div>

      {/* 捕获选择弹窗 */}
      {showCatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="pixel-border rounded-2xl p-6 bg-gray-800 max-w-sm w-full">
            <h3 className="text-xl font-bold text-yellow-300 mb-4 text-center">选择精灵球</h3>
            <div className="flex flex-col gap-2">
              {(Object.entries(POKEBALL_CONFIG) as [PokeBallType, typeof POKEBALL_CONFIG['normal']][]).map(([type, config]) => {
                const count = inventory[type] || 0;
                const hasBall = count > 0;
                return (
                  <button
                    key={type}
                    onClick={() => hasBall && handleCatch(type)}
                    disabled={!hasBall || isAnimating}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      hasBall ? 'bg-gray-700 hover:bg-gray-600 active:scale-95' : 'bg-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">{config.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-white">{config.name}</p>
                      <p className="text-xs text-gray-400">拥有: {count}个</p>
                    </div>
                    <span className="text-xs text-yellow-300">{hasBall ? getCatchHint(type) : '无'}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCatch(false)}
              className="mt-4 w-full py-2 rounded-xl bg-gray-700 text-gray-300 font-bold hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 替换弹窗 */}
      {showSwitch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="pixel-border rounded-2xl p-6 bg-gray-800 max-w-sm w-full">
            <h3 className="text-xl font-bold text-blue-300 mb-4 text-center">选择出战的宝可梦</h3>
            <div className="flex flex-col gap-2">
              {playerTeam.map((monster, index) => {
                const isActive = index === activePlayerIndex;
                const isFatigued = monster.fatigueEndTime && new Date() < monster.fatigueEndTime;
                const avatar = AVATAR_OPTIONS.find((a) => a.id === monster.avatar);
                const element = ELEMENT_CONFIG[monster.element];
                const hpPercent = Math.max(0, ((monster.maxHp ? monster.hp : monster.hp) / (monster.maxHp || monster.hp)) * 100);

                return (
                  <button
                    key={monster.id || index}
                    onClick={() => {
                      if (!isActive && !isFatigued && monster.hp > 0) {
                        switchPlayerMonster(index);
                        setShowSwitch(false);
                      }
                    }}
                    disabled={isActive || isFatigued || monster.hp <= 0}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-green-700/50 border-2 border-green-400'
                        : isFatigued || monster.hp <= 0
                        ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600 active:scale-95'
                    }`}
                  >
                    <span className="text-2xl">{avatar?.emoji || '❓'}</span>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-white">
                        {monster.name} {isActive && '(战斗中)'}
                        {isFatigued && '(疲劳中)'}
                        {monster.hp <= 0 && '(需要休息)'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {element?.emoji} Lv.{monster.level} | HP: {monster.hp}/{monster.maxHp || monster.hp}
                      </p>
                      <div className="h-2 bg-gray-600 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${hpPercent}%`,
                            backgroundColor: hpPercent > 60 ? '#22c55e' : hpPercent > 30 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSwitch(false)}
              className="mt-4 w-full py-2 rounded-xl bg-gray-700 text-gray-300 font-bold hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="pixel-border rounded-2xl p-6 bg-gray-800 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-yellow-300 mb-4">战斗奖励</h3>
            <div className="flex flex-col gap-2 mb-4">
              {rewardTexts.map((text, i) => (
                <p key={i} className="text-lg text-gray-300">{text}</p>
              ))}
            </div>
            <button
              onClick={() => { setShowReward(false); }}
              className="bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-400 active:scale-95 transition-all"
            >
              ✅ 收下奖励
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
