import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { CELL_ICONS, CELL_COLORS, CELL_NAMES, CONTINENT_EFFECTS, ensureGymCell, relocateLegacyCornerBoss } from '../game/continentData';
import { getMonsterElements } from '../game/monsterElements';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import MonsterElementBadges from '../components/MonsterElementBadges';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { randomEncounter } from '../game/wildMonsters';
import {
  CHAPTER_TASKS,
  addStoryFragment,
  completeTask,
  createTaskSticker,
  ensureAdventureChapter,
  getChapterConfig,
  getTaskRewardBall,
} from '../game/chapterSystem';
import {
  completeDailyTask,
  createDailySticker,
  getDailyTaskRewardBall,
  type DailyTaskAction,
} from '../game/dailyTasks';
import {
  createBossMonster,
  getMapDifficultyConfig,
  normalizeDifficulty,
  saveDifficultyExploration,
  scaleMonsterForDifficulty,
} from '../game/mapDifficulty';
import { applyExp } from '../game/rewardSystem';
import { addTrainerDiamonds, getRecoverableMaxHp } from '../game/trainerInventory';
import type { Adventure, Continent, MapCell, AdventureEvent, AdventureEventChoice, Monster, PokeBallType } from '../types';
import gymMarker from '../assets/gym/gym-marker.svg';

export default function MapPage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const [continent, setContinent] = useState<Continent | null>(null);
  const [currentPos, setCurrentPos] = useState({ x: 4, y: 4 });
  const [events, setEvents] = useState<AdventureEvent[]>([]);
  const [showEvent, setShowEvent] = useState<AdventureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedHint, setBlockedHint] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [partyCandidates, setPartyCandidates] = useState<Monster[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<number[]>([]);
  const [partyLoaded, setPartyLoaded] = useState(false);
  const [mustRetreat, setMustRetreat] = useState(false);
  const [parentNarration] = useState(() => localStorage.getItem('parentNarration') !== 'off');

  const currentAdventure = useGameStore((state) => state.currentAdventure);
  const setCurrentAdventure = useGameStore((state) => state.setCurrentAdventure);
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const mp = useMultiplayer();
  const isSharedExpedition = mp.connected && mp.mode === 'coop' && mp.gameState === 'playing';
  const visibleMapCalls = mp.mapCalls.filter((call) => call.playerId !== mp.socketId && call.expiresAt > Date.now());

  const isUsableForExpedition = (monster: Monster) =>
    monster.hp > 0 && (!monster.fatigueEndTime || new Date(monster.fatigueEndTime) <= new Date());

  useEffect(() => {
    if (isSharedExpedition && mp.teamBattle?.phase === 'active') {
      navigate('/team-battle');
    }
  }, [isSharedExpedition, mp.teamBattle?.battleId, mp.teamBattle?.phase, navigate]);

  useEffect(() => {
    const position = mp.socketId ? mp.playerPositions[mp.socketId] : undefined;
    if (isSharedExpedition && position && (position.x !== currentPos.x || position.y !== currentPos.y)) {
      setCurrentPos(position);
    }
  }, [currentPos.x, currentPos.y, isSharedExpedition, mp.playerPositions, mp.socketId]);

  useEffect(() => {
    if (!continentId) return;
    loadContinent();
  }, [continentId]);

  useEffect(() => {
    const partyIds = currentAdventure?.continentId === continentId ? currentAdventure?.mapPartyIds ?? [] : [];
    if (!partyLoaded || partyIds.length === 0) {
      setMustRetreat(false);
      return;
    }
    const party = partyCandidates.filter((monster) => partyIds.includes(monster.id ?? -1));
    setMustRetreat(party.length > 0 && !party.some(isUsableForExpedition));
  }, [continentId, currentAdventure?.continentId, currentAdventure?.mapPartyIds, partyCandidates, partyLoaded]);

  const loadContinent = async () => {
    setLoading(true);
    setPartyLoaded(false);
    setMustRetreat(false);
    try {
      const found = await db.continents.where('id').equals(continentId!).first();
      if (found) {
        const relocatedCells = relocateLegacyCornerBoss(found.cells, found.gridSize);
        const cells = ensureGymCell(relocatedCells, found.gridSize);
        const loadedContinent = cells === found.cells ? found : { ...found, cells };
        if (loadedContinent !== found && found.id !== undefined) {
          await db.continents.update(found.id, { cells });
        }
        setContinent(loadedContinent);
        // 恢复位置
        let adventureForMap: Adventure;
        if (currentAdventure && currentAdventure.continentId === continentId) {
          const restoredAdventure = ensureAdventureChapter(currentAdventure, loadedContinent);
          setCurrentPos(restoredAdventure.currentPosition);
          setEvents(restoredAdventure.events);
          setCurrentAdventure(restoredAdventure);
          adventureForMap = restoredAdventure;
        } else {
          // 初始化新冒险
          const startPos = { x: Math.floor(loadedContinent.gridSize / 2), y: Math.floor(loadedContinent.gridSize / 2) };
          const newAdventure = ensureAdventureChapter({
            trainerId: currentTrainer?.id,
            continentId: continentId!,
            difficulty: 'easy',
            currentPosition: startPos,
            events: [],
          }, loadedContinent);
          setCurrentPos(startPos);
          setCurrentAdventure(newAdventure);
          adventureForMap = newAdventure;
        }
        const monsters = currentTrainer?.id === undefined
          ? []
          : await db.monsters.where('trainerId').equals(currentTrainer.id).toArray();
        setPartyCandidates(monsters);
        setSelectedPartyIds(adventureForMap.mapPartyIds ?? []);
        setPartyLoaded(true);
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCell = useCallback(
    (x: number, y: number): MapCell | undefined => {
      return continent?.cells.find((c) => c.x === x && c.y === y);
    },
    [continent]
  );

  const getStorageKey = (key: string) => {
    const trainerId = currentTrainer?.id;
    return trainerId ? `${key}_trainer_${trainerId}` : key;
  };

  const addPokeballReward = (type: PokeBallType, count: number) => {
    const saved = localStorage.getItem(getStorageKey('pokeballs'));
    const inventory = saved
      ? JSON.parse(saved)
      : { normal: 3, great: 1, ultra: 0, master: 0, legend: 0, transcend: 0 };
    inventory[type] = (inventory[type] || 0) + count;
    localStorage.setItem(getStorageKey('pokeballs'), JSON.stringify(inventory));
  };

  /** Rest points heal the partner who needs it most, including a fainted one. */
  const restoreMostTiredPartner = async (amount: number) => {
    if (currentTrainer?.id === undefined) return { name: '伙伴', restored: 0 };
    const partyIds = useGameStore.getState().currentAdventure?.mapPartyIds ?? [];
    const monsters = (await db.monsters.where('trainerId').equals(currentTrainer.id).toArray())
      .filter((monster) => partyIds.includes(monster.id ?? -1));
    const target = [...monsters].sort((a, b) => {
      const aRatio = a.hp / (a.maxHp || a.hp || 1);
      const bRatio = b.hp / (b.maxHp || b.hp || 1);
      return aRatio - bRatio;
    })[0];
    if (!target || target.id === undefined) return { name: '伙伴', restored: 0 };
    const maxHp = getRecoverableMaxHp(target);
    const nextHp = Math.min(maxHp, target.hp + amount);
    const restored = Math.max(0, nextHp - target.hp);
    if (restored > 0) await db.monsters.update(target.id, { hp: nextHp, maxHp, fatigueEndTime: undefined });
    return { name: target.name, restored };
  };

  const grantActivePartnerExp = async (amount: number) => {
    if (currentTrainer?.id === undefined) return null;
    const partyIds = useGameStore.getState().currentAdventure?.mapPartyIds ?? [];
    const monsters = (await db.monsters.where('trainerId').equals(currentTrainer.id).toArray())
      .filter((monster) => partyIds.includes(monster.id ?? -1));
    const target = monsters.find((monster) => monster.id === currentTrainer.activeMonsterId) ?? monsters[0];
    if (!target || target.id === undefined) return null;
    const { monster: updated, leveledUp } = applyExp(target, amount);
    await db.monsters.update(target.id, {
      level: updated.level,
      exp: updated.exp,
      expToNext: updated.expToNext,
      hp: updated.hp,
      maxHp: updated.maxHp,
      attack: updated.attack,
      defense: updated.defense,
      speed: updated.speed,
      skills: updated.skills,
    });
    return { name: updated.name, leveledUp };
  };

  const showTaskToast = (message: string) => {
    setTaskMessage((prev) => prev ? `${prev} ${message}` : message);
    setTimeout(() => setTaskMessage(null), 4500);
  };

  const awardDailyTaskReward = async (action: DailyTaskAction) => {
    const { completedNow, task, bonusCompletedNow } = completeDailyTask(action, currentTrainer?.id);
    if (!completedNow || !task) return;

    const ball = getDailyTaskRewardBall(task.id);
    addPokeballReward(ball.type, ball.count);
    let message = `${task.emoji} 完成今日目标：${task.label}！${task.rewardText}。`;

    if (bonusCompletedNow) {
      const sticker = createDailySticker(currentTrainer?.id);
      const existingSticker = await db.stickers
        .where('stickerId')
        .equals(sticker.stickerId)
        .and((item) => item.trainerId === currentTrainer?.id)
        .first();
      if (!existingSticker) {
        await db.stickers.add(sticker);
      }
      message += ' 今日目标全部完成，获得彩虹贴纸！';
    }

    showTaskToast(message);
  };

  const awardTaskReward = async (taskId: string, baseAdventure: Adventure, cont: Continent) => {
    const { adventure, completedNow } = completeTask(baseAdventure, taskId);
    if (!completedNow) return baseAdventure;

    const ball = getTaskRewardBall(taskId);
    addPokeballReward(ball.type, ball.count);
    await db.stickers.add(createTaskSticker(cont, taskId, currentTrainer?.id));

    const { adventure: withFragment, fragmentText } = addStoryFragment(adventure, cont);
    const task = CHAPTER_TASKS[taskId];
    const message = `${task.emoji} 完成小任务：${task.label}！获得 ${ball.count} 个精灵球和新贴纸。`;
    showTaskToast(fragmentText ? `${message} 故事碎片：${fragmentText}` : message);
    return withFragment;
  };

  const handleMove = async (dx: number, dy: number) => {
    if (!continent || showEvent) return;
    const partyIds = useGameStore.getState().currentAdventure?.mapPartyIds ?? [];
    const expeditionParty = partyCandidates.filter((monster) => partyIds.includes(monster.id ?? -1));
    if (partyIds.length === 0) return;
    if (!expeditionParty.some(isUsableForExpedition)) {
      setMustRetreat(true);
      return;
    }

    const newX = currentPos.x + dx;
    const newY = currentPos.y + dy;

    // 边界检查
    if (newX < 0 || newX >= continent.gridSize || newY < 0 || newY >= continent.gridSize) {
      return;
    }

    const targetCell = getCell(newX, newY);
    if (!targetCell || targetCell.type === 'blocked') {
      return; // 障碍物不能走
    }

    // 更新位置
    const newPos = { x: newX, y: newY };
    setCurrentPos(newPos);
    if (isSharedExpedition && mp.roomId) {
      mp.sendPlayerMove(mp.roomId, newPos);
    }

    // 标记已访问
    const updatedCells = continent.cells.map((cell) => {
      const distance = Math.abs(cell.x - newX) + Math.abs(cell.y - newY);
      if (distance === 0) return { ...cell, visited: true, revealed: true };
      if (distance === 1) return { ...cell, revealed: true };
      return cell;
    });

    const chapterAdventure = ensureAdventureChapter({
      ...(currentAdventure ?? {
        continentId: continentId!,
        difficulty: 'easy',
        currentPosition: newPos,
        events,
      }),
      currentPosition: newPos,
      events,
    }, continent);

    // 触发事件
    const event = await triggerEvent(targetCell.type, continent, newPos.x, newPos.y);
    let nextAdventure = chapterAdventure;
    if (targetCell.type === 'treasure') {
      nextAdventure = await awardTaskReward('treasure', nextAdventure, continent);
      await awardDailyTaskReward('treasure');
    } else if (targetCell.type === 'rest') {
      nextAdventure = await awardTaskReward('rest', nextAdventure, continent);
      await awardDailyTaskReward('rest');
    } else if (targetCell.type === 'wild') {
      nextAdventure = await awardTaskReward('encounter', nextAdventure, continent);
      await awardDailyTaskReward('encounter');
    }

    // 宝箱是一次性资源：领取后变成普通地面，图标不再出现也不能重复领奖。
    const finalCells = targetCell.type === 'treasure'
      ? updatedCells.map((cell) => cell.x === newX && cell.y === newY
        ? { ...cell, type: 'empty' as const, visited: true, revealed: true }
        : cell)
      : updatedCells;
    const finalContinent = { ...continent, cells: finalCells };
    setContinent(finalContinent);

    if (event) {
      setShowEvent(event);
      const newEvents = [...events, event];
      setEvents(newEvents);

      // 保存冒险状态（包含新事件）
      const savedAdventure = {
        ...nextAdventure,
        events: newEvents,
        pendingBattleType: event.type === 'battle' ? event.cellType === 'boss' ? 'boss' : 'wild' : nextAdventure.pendingBattleType,
      };
      setCurrentAdventure(savedAdventure);
      saveDifficultyExploration(continent.id, savedAdventure.difficulty, currentTrainer?.id, finalCells, savedAdventure);
    } else {
      // 无事件也保存位置
      const savedAdventure = {
        ...nextAdventure,
        events,
      };
      setCurrentAdventure(savedAdventure);
      saveDifficultyExploration(continent.id, savedAdventure.difficulty, currentTrainer?.id, finalCells, savedAdventure);
    }

    // 更新数据库
    await db.continents.update(continent.id!, { cells: finalCells });
  };

  const triggerEvent = async (cellType: string, cont: Continent, x: number, y: number): Promise<AdventureEvent | null> => {
    const chapter = getChapterConfig(cont);
    const difficulty = normalizeDifficulty(useGameStore.getState().currentAdventure?.difficulty);
    const difficultyConfig = getMapDifficultyConfig(difficulty);
    switch (cellType) {
      case 'wild': {
        // 根据大陆属性生成野生宝可梦，传入当前位置
        const generatedWildMonster = randomEncounter(cont.element, x, y, cont.gridSize);
        const wildMonster = generatedWildMonster
          ? scaleMonsterForDifficulty(generatedWildMonster, difficulty)
          : null;
        if (wildMonster) {
          // 保存野生宝可梦到状态，供战斗页面使用
          useGameStore.getState().setWildMonster(wildMonster);
          // 保存遭遇记录到数据库
          try {
            await db.encounters.add({
              trainerId: currentTrainer?.id,
              monsterName: wildMonster.name,
              monsterElements: getMonsterElements(wildMonster),
              monsterElement: wildMonster.element,
              monsterLevel: wildMonster.level,
              monsterAvatar: wildMonster.avatar,
              continentName: cont.name,
              encounteredAt: new Date(),
              captured: false,
              defeated: false,
            });
          } catch (err) {
            console.error('保存遭遇记录失败:', err);
          }
          return {
            type: 'battle',
            description: `草丛晃了一下，${difficultyConfig.label}难度的 Lv.${wildMonster.level} ${wildMonster.name} 跳了出来！它看起来想和你比试一下。`,
            completed: false,
            cellType: 'wild',
            parentPrompt: '家长旁白：问问孩子，要用哪只伙伴来打招呼式地比试？',
          };
        }
        // 如果没有匹配的宝可梦，使用默认
        return {
          type: 'battle',
          description: '遭遇了野生宝可梦！准备战斗！',
          completed: false,
          cellType: 'wild',
        };
      }
      case 'treasure': {
        const rewards = [
          { desc: '发现经验果实！', exp: 20 },
          { desc: '发现治愈草药！', hp: 20 },
          { desc: '发现神秘宝箱！', exp: 30 },
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        const diamonds = 2 + Math.floor(Math.random() * 4);
        addTrainerDiamonds(diamonds, currentTrainer?.id);
        if (reward.hp) {
          const restored = await restoreMostTiredPartner(reward.hp);
          return {
            type: 'item',
            description: restored.restored > 0
              ? `${reward.desc}${restored.name}恢复了 ${restored.restored} HP！还找到了 💎 ${diamonds} 枚钻石。`
              : `${reward.desc}大家状态正好，先把草药收进背包了，还找到了 💎 ${diamonds} 枚钻石。`,
            completed: true,
            reward: { hp: restored.restored || undefined, diamonds },
            cellType: 'treasure',
            parentPrompt: '家长旁白：请孩子猜猜宝箱里还藏着什么亮晶晶的东西。',
          };
        }
        const expTarget = await grantActivePartnerExp(reward.exp ?? 0);
        return {
          type: 'item',
          description: `${reward.desc}${expTarget ? `${expTarget.name}获得 ${reward.exp} 经验！${expTarget.leveledUp ? ' 升级啦！' : ''}` : ''} 还找到了 💎 ${diamonds} 枚钻石！`,
          completed: true,
          reward: { exp: reward.exp, diamonds },
          cellType: 'treasure',
          parentPrompt: '家长旁白：请孩子猜猜宝箱里还藏着什么亮晶晶的东西。',
        };
      }
      case 'rest': {
        const restored = await restoreMostTiredPartner(30);
        return {
          type: 'rest',
          description: restored.restored > 0
            ? `在休息点歇一歇，${restored.name}恢复了 ${restored.restored} HP！`
            : '伙伴们状态很好，在休息点补充了水和点心。',
          completed: true,
          reward: restored.restored > 0 ? { hp: restored.restored } : undefined,
          cellType: 'rest',
          parentPrompt: '家长旁白：请孩子说说伙伴吃了什么点心恢复体力。',
        };
      }
      case 'boss': {
        const activeAdventure = useGameStore.getState().currentAdventure;
        if (!activeAdventure?.gymProgress?.cleared) {
          return {
            type: 'npc',
            description: `🔒 ${cont.bossName}前的道路被道馆许可封住了。先通过${cont.element ? ELEMENT_CONFIG[cont.element]?.label : ''}属性道馆，拿到挑战资格吧！`,
            completed: false,
            cellType: 'boss',
            parentPrompt: '家长旁白：守护者说，先证明你愿意认真照顾伙伴，才可以挑战它。',
          };
        }
        const bossMonster = createBossMonster(cont, difficulty);
        useGameStore.getState().setWildMonster(bossMonster);
        return {
          type: 'battle',
          description: `⚠️ ${difficultyConfig.displayLabel}Boss战！${chapter.bossIntro}`,
          completed: false,
          cellType: 'boss',
          parentPrompt: `家长扮演Boss：我是${cont.bossName}，让我看看你们的勇气！`,
        };
      }
      case 'gym': {
        const gymCleared = useGameStore.getState().currentAdventure?.gymProgress?.cleared;
        return {
          type: 'npc',
          description: gymCleared
            ? `🏅 ${ELEMENT_CONFIG[cont.element]?.label}属性道馆已认可你。馆主邀请你来一场复赛！`
            : `🏠 你找到了${ELEMENT_CONFIG[cont.element]?.label}属性道馆！馆主正在里面等你阅读挑战书。`,
          completed: false,
          cellType: 'gym',
          parentPrompt: '家长旁白：请孩子先猜猜这座道馆会擅长什么属性。',
        };
      }
      case 'empty': {
        const alreadyHappenedHere = events.some(
          (event) => event.mapPosition?.x === x && event.mapPosition?.y === y
        );
        const storyCount = events.filter((event) => event.type === 'story').length;
        if (alreadyHappenedHere || storyCount >= 2) return null;

        const helpChoice: AdventureEventChoice = {
          id: 'help',
          label: '🤝 帮帮它',
          outcome: '伙伴开心地记住了这次帮助，和你的默契 +1！',
          bondDelta: 1,
          bossHint: `${cont.bossName}蓄力时，用克制属性攻击可以打断它。`,
        };
        const hurryChoice: AdventureEventChoice = {
          id: 'explore',
          label: '🔎 找找线索',
          outcome: `你发现了通往${cont.bossName}的小线索！`,
          bossHint: `${cont.bossName}撑起护盾时，普通攻击会变弱。`,
        };
        return {
          type: 'story',
          description: `${cont.emoji} 路边传来小小的求助声。你和伙伴想怎么做？`,
          completed: false,
          cellType: 'empty',
          mapPosition: { x, y },
          choices: [helpChoice, hurryChoice],
          parentPrompt: '家长旁白：请孩子说说，伙伴会怎么回应这次求助？',
        };
      }
      default:
        return null;
    }
  };

  const handleEventAction = (action: 'fight' | 'run' | 'ok') => {
    if (!showEvent || !continent) return;

    if (action === 'fight' && showEvent.cellType === 'gym') {
      setShowEvent(null);
      navigate(`/gym/${continentId}`);
    } else if (action === 'fight' && showEvent.type === 'battle') {
      setShowEvent(null);
      if (isSharedExpedition && mp.roomId) {
        const wildMonster = useGameStore.getState().wildMonster;
        mp.sendEncounter(
          mp.roomId,
          wildMonster?.name ?? continent.bossName,
          wildMonster?.level ?? 1,
          wildMonster?.element ?? continent.element,
          wildMonster?.avatar ?? continent.bossAvatar,
          getMonsterElements(wildMonster ?? { element: continent.element }),
        );
      } else {
        navigate('/battle-select');
      }
    } else if (action === 'run') {
      setShowEvent(null);
    } else if (action === 'ok') {
      // 领取奖励
      setShowEvent(null);
    }
  };

  const handleStoryChoice = (choice: AdventureEventChoice) => {
    if (!showEvent || !currentAdventure || !continent) return;
    const completedEvent: AdventureEvent = {
      ...showEvent,
      completed: true,
      description: `${showEvent.description}\n${choice.outcome}`,
      choices: undefined,
    };
    const nextEvents = events.map((event) => event === showEvent ? completedEvent : event);
    const existingHints = currentAdventure.bossHints ?? [];
    const nextAdventure: Adventure = {
      ...currentAdventure,
      events: nextEvents,
      bondPoints: Math.min(3, (currentAdventure.bondPoints ?? 0) + (choice.bondDelta ?? 0)),
      bossHints: choice.bossHint && !existingHints.includes(choice.bossHint)
        ? [...existingHints, choice.bossHint]
        : existingHints,
    };
    setEvents(nextEvents);
    setCurrentAdventure(nextAdventure);
    saveDifficultyExploration(continent.id, nextAdventure.difficulty, currentTrainer?.id, continent.cells, nextAdventure);
    showTaskToast(choice.outcome);
    setShowEvent(null);
  };

  const handleCompleteContinent = async () => {
    if (!continent) return;
    await db.continents.update(continent.id!, { completed: true });
    setContinent({ ...continent, completed: true });
    setCurrentAdventure(null);
  };

  const togglePartyMember = (monsterId?: number) => {
    if (monsterId === undefined) return;
    setSelectedPartyIds((previous) => {
      if (previous.includes(monsterId)) return previous.filter((id) => id !== monsterId);
      return [...previous, monsterId];
    });
  };

  const selectAllUsablePartners = () => {
    setSelectedPartyIds(partyCandidates
      .filter(isUsableForExpedition)
      .map((monster) => monster.id)
      .filter((id): id is number => id !== undefined));
  };

  const beginExpedition = () => {
    const usableSelected = partyCandidates.filter((monster) => selectedPartyIds.includes(monster.id ?? -1) && isUsableForExpedition(monster));
    if (usableSelected.length === 0) {
      setTaskMessage('至少带 1 只可出战的伙伴，才能进入地图。');
      return;
    }
    const adventure = useGameStore.getState().currentAdventure;
    if (!adventure || !continent) return;
    const nextAdventure = { ...adventure, mapPartyIds: selectedPartyIds };
    setCurrentAdventure(nextAdventure);
    saveDifficultyExploration(continent.id, nextAdventure.difficulty, currentTrainer?.id, continent.cells, nextAdventure);
    setMustRetreat(false);
  };

  const retreatFromMap = () => {
    const adventure = useGameStore.getState().currentAdventure;
    const recoverPartyAndLeave = async () => {
      if (adventure && currentTrainer?.id !== undefined) {
        const partyIds = adventure.mapPartyIds ?? [];
        const party = (await db.monsters.where('trainerId').equals(currentTrainer.id).toArray())
          .filter((monster) => partyIds.includes(monster.id ?? -1));
        await Promise.all(party.map((monster) => {
          if (monster.id === undefined) return Promise.resolve();
          const maxHp = getRecoverableMaxHp(monster);
          // Forced retreat is the safe, child-friendly recovery path.  A gym
          // fatigue timer deliberately remains in place, so the challenge
          // consequence still matters.
          return db.monsters.update(monster.id, { hp: Math.max(monster.hp, Math.ceil(maxHp * 0.5)), maxHp });
        }));
      }
      if (adventure && continent) {
        const nextAdventure = { ...adventure, mapPartyIds: [] };
        setCurrentAdventure(nextAdventure);
        saveDifficultyExploration(continent.id, nextAdventure.difficulty, currentTrainer?.id, continent.cells, nextAdventure);
      }
      navigate('/adventure');
    };
    void recoverPartyAndLeave();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-lg text-gray-300 mt-4">加载地图...</p>
      </div>
    );
  }

  if (!continent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-gray-400">大陆不存在</p>
        <Link to="/adventure" className="text-blue-400 hover:text-blue-300">
          ← 返回大陆选择
        </Link>
      </div>
    );
  }

  const elementInfo = ELEMENT_CONFIG[continent.element];
  const effects = CONTINENT_EFFECTS[continent.element];
  const adventure = currentAdventure?.continentId === continent.id
    ? ensureAdventureChapter(currentAdventure, continent)
    : null;
  const difficulty = normalizeDifficulty(adventure?.difficulty);
  const difficultyConfig = getMapDifficultyConfig(difficulty);
  const chapter = getChapterConfig(continent);
  const taskIds = adventure?.taskIds ?? [];
  const completedTaskIds = adventure?.completedTaskIds ?? [];
  const gymCleared = adventure?.gymProgress?.cleared ?? false;
  const mapPartyIds = adventure?.mapPartyIds ?? [];

  if (partyLoaded && mapPartyIds.length === 0) {
    const usableCount = partyCandidates.filter(isUsableForExpedition).length;
    return (
      <div className="min-h-[100dvh] bg-[#171226] px-4 py-6 text-white">
        <div className="mx-auto w-full max-w-xl">
          <button onClick={() => navigate('/adventure')} className="mb-4 text-lg font-bold text-blue-300">← 返回大陆选择</button>
          <section className="rounded-3xl border-2 border-yellow-300/45 bg-[#29213d] p-5 shadow-2xl">
            <p className="text-sm font-bold text-yellow-200">{continent.emoji} {continent.name} · {difficultyConfig.displayLabel}</p>
            <h1 className="mt-2 text-3xl font-black text-white">出发前，选远征小队</h1>
            <p className="mt-2 text-sm leading-6 text-gray-200">想带多少伙伴都可以。没有选中的伙伴会留在宝可梦仓库，不能中途加入战斗。</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-100"><span>已选择 {selectedPartyIds.length} 只 · 仓库中可出战 {usableCount} 只</span><div className="flex gap-2"><button onClick={selectAllUsablePartners} className="rounded-lg bg-cyan-200/20 px-2 py-1 text-xs font-black text-cyan-100">全带上</button><button onClick={() => setSelectedPartyIds([])} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black text-gray-100">清空</button></div></div>
            <div className="mt-4 grid gap-2">
              {partyCandidates.map((monster) => {
                const selected = selectedPartyIds.includes(monster.id ?? -1);
                const usable = isUsableForExpedition(monster);
                const avatar = AVATAR_OPTIONS.find((option) => option.id === monster.avatar);
                return <button key={monster.id} disabled={!usable && !selected} onClick={() => togglePartyMember(monster.id)} className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'border-yellow-300 bg-yellow-400/15' : 'border-gray-600 bg-gray-800/70 hover:bg-gray-700/80'}`}>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#36264e] text-2xl">{avatar?.emoji ?? '❓'}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-black">{monster.name}</span><MonsterElementBadges monster={monster} badgeClassName="mt-1 text-[11px] font-bold" /><span className="mt-1 block text-xs text-gray-300">HP {monster.hp}/{monster.maxHp ?? monster.hp}{!usable && (monster.hp <= 0 ? ' · 需要休息点恢复' : ' · 休眠中')}</span></span>
                  <span className="font-black text-yellow-200">{selected ? '✓ 已带上' : usable ? '带上' : '不可用'}</span>
                </button>;
              })}
            </div>
            {partyCandidates.length === 0 && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm font-bold text-red-100">你还没有伙伴，先去创造一只吧。</p>}
            {taskMessage && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-100">{taskMessage}</p>}
            <button onClick={beginExpedition} disabled={usableCount === 0} className="mt-5 w-full rounded-xl border-2 border-yellow-200 bg-[#c94952] px-5 py-4 text-lg font-black text-white shadow-lg transition hover:bg-[#dc5963] disabled:cursor-not-allowed disabled:border-gray-500 disabled:bg-gray-700">⚔️ 带着这支小队出发</button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="map-page flex flex-col min-h-[100dvh] p-4 gap-4 relative overflow-hidden"
      style={effects ? { background: effects.bgGradient } : undefined}
    >
      {/* 环境粒子特效 */}
      {effects && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`absolute text-lg opacity-20 ${effects.particleAnimation}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              {effects.particleEmoji}
            </span>
          ))}
        </div>
      )}

      {/* 顶部 */}
      <div className="map-header sticky top-0 z-40 flex items-center justify-between bg-[#1a1a2e]/85 py-2 backdrop-blur">
        <Link to="/adventure" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-yellow-300 pixel-title">
            {continent.emoji} {continent.name}
          </h1>
          <p className="text-xs text-gray-400">
            {elementInfo?.emoji} {elementInfo?.label}属性大陆
          </p>
          <p className="mt-1 inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-500/15 px-2 py-0.5 text-xs font-bold text-yellow-100">
            {difficultyConfig.emoji} {difficultyConfig.displayLabel}
          </p>
          {effects && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {effects.ambienceText}
            </p>
          )}
        </div>
        <div className="w-12" />
      </div>

      {/* 章节目标与小任务 */}
      <div className="map-task-panel relative z-10 pixel-border rounded-xl p-3 bg-gray-900/70">
        {isSharedExpedition && (
          <div className="mb-3 rounded-lg border border-blue-400/40 bg-blue-500/10 p-2">
            <p className="text-sm font-bold text-blue-100">搭档远征 {mp.players.length}/3</p>
            <p className="mt-1 text-xs text-blue-200/80">队友棋子会实时出现。发现战斗后，所有人将进入同一场 Boss 战。</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => mp.sendMapCall('boss', '发现 Boss！快来一起挑战！')} className="rounded-md bg-red-500/25 px-2 py-1 text-xs font-bold text-red-100">📣 发现 Boss！</button>
              <button onClick={() => mp.sendMapCall('help', '来帮我！我在这里等你！')} className="rounded-md bg-blue-500/25 px-2 py-1 text-xs font-bold text-blue-100">🆘 来帮我！</button>
              <button onClick={() => mp.sendMapCall('treasure', '这里有宝箱！一起来看看！')} className="rounded-md bg-yellow-500/25 px-2 py-1 text-xs font-bold text-yellow-100">💎 这里有宝箱！</button>
            </div>
            <div className="mt-3 border-t border-blue-300/20 pt-2">
              <p className="text-xs font-bold text-blue-100">分路准备：线索路削弱 Boss，补给路提高全队体力</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button onClick={() => mp.chooseMapRole('clue')} className={`rounded-md px-2 py-1 text-xs font-bold ${mp.mapRoles[mp.socketId ?? ''] === 'clue' ? 'bg-purple-300 text-purple-950' : 'bg-purple-500/25 text-purple-100'}`}>🔎 我去查线索</button>
                <button onClick={() => mp.chooseMapRole('supply')} className={`rounded-md px-2 py-1 text-xs font-bold ${mp.mapRoles[mp.socketId ?? ''] === 'supply' ? 'bg-emerald-300 text-emerald-950' : 'bg-emerald-500/25 text-emerald-100'}`}>🎒 我去找补给</button>
              </div>
              {mp.players.filter((player) => mp.mapRoles[player.id]).map((player) => <p key={player.id} className="mt-1 text-xs text-blue-100/80">{player.name}：{mp.mapRoles[player.id] === 'clue' ? '🔎 查线索' : '🎒 找补给'}</p>)}
            </div>
            {visibleMapCalls.map((call) => <p key={call.id} className="mt-2 rounded bg-white/10 px-2 py-1 text-xs font-bold text-white">{call.playerName}：{call.message}</p>)}
          </div>
        )}
        <p className="text-sm text-yellow-200 font-bold">今日目标：{chapter.goalText}</p>
        <p className="mt-1 text-xs text-gray-300">
          当前难度：{difficultyConfig.description}
        </p>
        <p className="mt-1 text-xs text-pink-200">💞 伙伴默契：{adventure?.bondPoints ?? 0}/3</p>
        <p className={`mt-1 text-xs font-bold ${gymCleared ? 'text-green-200' : 'text-orange-200'}`}>
          {gymCleared ? '🏅 道馆许可已获得：Boss 已解锁' : '🏠 下一步：先找到并挑战属性道馆'}
        </p>
        <p className="mt-1 text-xs text-cyan-100">🎒 远征小队：{mapPartyIds.length} 只 · 仓库伙伴本次留守</p>
        <div className="map-task-grid grid grid-cols-3 gap-2 mt-2">
          {taskIds.map((taskId) => {
            const task = CHAPTER_TASKS[taskId];
            const done = completedTaskIds.includes(taskId);
            return (
              <div
                key={taskId}
                className={`rounded-lg px-2 py-2 text-center text-xs font-bold border ${
                  done
                    ? 'bg-green-500/20 text-green-200 border-green-400/50'
                    : 'bg-gray-800/80 text-gray-300 border-gray-700'
                }`}
              >
                <div className="text-lg">{done ? '✅' : task.emoji}</div>
                <div>{task.shortLabel}</div>
              </div>
            );
          })}
        </div>
        {taskMessage && (
          <div className="mt-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 p-2 text-sm text-yellow-100">
            {taskMessage}
          </div>
        )}
      </div>

      {/* 地图网格 */}
      <div className="map-board-wrap flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
        <div
          className="map-grid grid gap-1 p-2 rounded-xl backdrop-blur-sm"
          style={{
            ['--map-grid-size' as string]: continent.gridSize,
            gridTemplateColumns: `repeat(${continent.gridSize}, minmax(0, 1fr))`,
            backgroundColor: continent.themeColor + '20',
            border: `2px solid ${continent.themeColor}40`,
          }}
        >
          {continent.cells.map((cell) => {
            const isCurrent = cell.x === currentPos.x && cell.y === currentPos.y;
            const isRevealed = cell.revealed || cell.visited;
            const teammatesHere = isSharedExpedition
              ? mp.players.filter((player) => player.id !== mp.socketId && mp.playerPositions[player.id]?.x === cell.x && mp.playerPositions[player.id]?.y === cell.y)
              : [];

            return (
              <div
                key={`${cell.x}-${cell.y}`}
                onClick={() => {
                  if (isCurrent || showEvent) return;
                  const dx = cell.x - currentPos.x;
                  const dy = cell.y - currentPos.y;
                  if (Math.abs(dx) + Math.abs(dy) === 1) {
                    handleMove(dx, dy);
                  }
                }}
                className={`
                  map-cell w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center text-xl
                  transition-all duration-200 relative select-none
                  ${isCurrent ? 'ring-2 ring-yellow-400 scale-110 z-10' : ''}
                  ${cell.visited ? 'opacity-80' : ''}
                  ${!isRevealed ? 'opacity-30' : ''}
                  ${isRevealed && !isCurrent && !showEvent ? 'cursor-pointer active:scale-95 hover:brightness-110' : ''}
                `}
                style={{
                  backgroundColor: isRevealed ? CELL_COLORS[cell.type] + '40' : '#1f2937',
                }}
              >
                {isCurrent ? (
                  <span className="text-2xl animate-bounce">🧑‍🎤</span>
                ) : isRevealed ? (
                  cell.type === 'gym' ? (
                    <img src={gymMarker} alt={`${elementInfo?.label ?? ''}属性道馆`} className="h-11 w-11 object-contain drop-shadow-md" />
                  ) : <span>{CELL_ICONS[cell.type]}</span>
                ) : (
                  <span className="text-gray-600">?</span>
                )}

                {/* 已访问标记 */}
                {cell.visited && !isCurrent && (
                  <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                )}
                {teammatesHere.length > 0 && (
                  <div className="absolute -right-1 -top-1 flex -space-x-1">
                    {teammatesHere.map((player, index) => (
                      <span key={player.id} title={player.name} className={`grid h-4 w-4 place-items-center rounded-full border border-white text-[9px] font-bold text-gray-900 ${index === 0 ? 'bg-cyan-300' : 'bg-pink-300'}`}>
                        {player.name.slice(0, 1)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 当前位置信息 */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            位置: ({currentPos.x + 1}, {currentPos.y + 1}) |
            {(() => {
              const cell = getCell(currentPos.x, currentPos.y);
              return cell ? ` ${CELL_NAMES[cell.type]}` : '';
            })()}
          </p>
        </div>
      </div>

      {/* 事件弹窗 */}
      {showEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="pixel-border rounded-2xl p-6 bg-gray-800 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">
              {showEvent.cellType === 'gym' ? <img src={gymMarker} alt="属性道馆" className="mx-auto h-16 w-16" /> : showEvent.type === 'battle' ? '⚔️' : showEvent.type === 'item' ? '💎' : showEvent.type === 'story' ? '✨' : '💤'}
            </div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">
              {showEvent.cellType === 'gym' ? '属性道馆' : showEvent.type === 'battle' ? '遭遇！' : showEvent.type === 'item' ? '发现！' : showEvent.type === 'story' ? '小小选择' : '休息点'}
            </h3>
            <p className="text-lg text-gray-300 mb-4">{showEvent.description}</p>
            {parentNarration && showEvent.parentPrompt && (
              <p className="text-sm text-blue-200 bg-blue-900/30 rounded-lg p-2 mb-4">
                {showEvent.parentPrompt}
              </p>
            )}

            {showEvent.reward && (
              <div className="mb-4">
                {showEvent.reward.exp && (
                  <p className="text-yellow-400">获得 {showEvent.reward.exp} 经验</p>
                )}
                {showEvent.reward.hp && (
                  <p className="text-green-400">恢复 {showEvent.reward.hp} HP</p>
                )}
                {showEvent.reward.diamonds && (
                  <p className="text-cyan-200">获得 💎 {showEvent.reward.diamonds} 枚钻石</p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {showEvent.cellType === 'gym' ? (
                <>
                  <button
                    onClick={() => handleEventAction('fight')}
                    className="bg-yellow-500 text-gray-900 px-6 py-2 rounded-xl font-bold hover:bg-yellow-400 active:scale-95 transition-all"
                  >
                    📜 查看挑战书
                  </button>
                  <button
                    onClick={() => handleEventAction('run')}
                    className="bg-gray-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-500 active:scale-95 transition-all"
                  >
                    🌿 先去探索
                  </button>
                </>
              ) : showEvent.type === 'battle' ? (
                <>
                  <button
                    onClick={() => handleEventAction('fight')}
                    className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-400 active:scale-95 transition-all"
                  >
                    ⚔️ 战斗
                  </button>
                  <button
                    onClick={() => handleEventAction('run')}
                    className="bg-gray-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-500 active:scale-95 transition-all"
                  >
                    🏃 逃跑
                  </button>
                </>
              ) : showEvent.choices?.length ? (
                <div className="grid w-full gap-2">
                  {showEvent.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleStoryChoice(choice)}
                      className="bg-purple-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-400 active:scale-95 transition-all"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => handleEventAction('ok')}
                  className="bg-green-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-green-400 active:scale-95 transition-all"
                >
                  ✅ 好的
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mustRetreat && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b0916]/85 p-6" role="dialog" aria-modal="true" aria-label="远征撤退">
          <section className="w-full max-w-sm rounded-3xl border-2 border-orange-300/70 bg-[#30233c] p-6 text-center shadow-2xl">
            <p className="text-5xl">🏕️</p>
            <h2 className="mt-3 text-2xl font-black text-orange-100">远征小队需要休整</h2>
            <p className="mt-3 leading-7 text-gray-100">带进地图的伙伴目前都在休眠或已经倒下了。这次远征要先撤退回大陆选择，重新安排能出战的伙伴。</p>
            <p className="mt-3 rounded-xl bg-emerald-400/10 p-3 text-sm font-bold leading-6 text-emerald-100">已经探索的区域和拿到的资源都会保留；返回大陆时，这支小队会恢复到一半 HP。</p>
            <p className="mt-2 text-xs leading-5 text-orange-100/85">如果是道馆失败带来的休眠，休眠倒计时仍会继续。</p>
            <button onClick={retreatFromMap} className="mt-5 w-full rounded-xl border-2 border-yellow-200 bg-[#c94952] px-5 py-4 text-lg font-black text-white shadow-lg transition hover:bg-[#dc5963]">好，先撤退休整</button>
          </section>
        </div>
      )}

      {/* 通关按钮 */}
      {continent.completed && (
        <div className="text-center">
          <p className="text-green-400 font-bold mb-2">🎉 已通关！</p>
        </div>
      )}
    </div>
  );
}
