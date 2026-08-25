import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import MonsterElementBadges from '../components/MonsterElementBadges';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import gymArena from '../assets/gym/gym-arena.svg';
import {
  createGymBattleState,
  type GymBattleState,
  type GymTurnAction,
  resolveGymRound,
} from '../game/gymBattleEngine';
import { getBattleStatusConfig } from '../game/battleEngine';
import { getGymDefinition, GYM_FORMAT_LABEL, GYM_SWITCH_RULE_LABEL } from '../game/gymSystem';
import { addTrainerDiamonds } from '../game/trainerInventory';
import type { Badge, Continent, GymProgress, Monster } from '../types';

export default function GymBattlePage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const adventure = useGameStore((state) => state.currentAdventure);
  const setCurrentAdventure = useGameStore((state) => state.setCurrentAdventure);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [team, setTeam] = useState<Monster[]>([]);
  const [progress, setProgress] = useState<GymProgress | null>(null);
  const [battle, setBattle] = useState<GymBattleState | null>(null);
  const [actions, setActions] = useState<Record<string, GymTurnAction>>({});
  const [activeActorId, setActiveActorId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!continentId || currentTrainer?.id === undefined || adventure?.continentId !== continentId) return;
    void Promise.all([
      db.continents.where('id').equals(continentId).first(),
      db.monsters.where('trainerId').equals(currentTrainer.id).toArray(),
    ]).then(([found, monsters]) => {
      const gymProgress = adventure.gymProgress;
      if (!found || !gymProgress?.challenge) return;
      try {
        const partyIds = adventure.mapPartyIds;
        const expeditionTeam = partyIds?.length ? monsters.filter((monster) => monster.id !== undefined && partyIds.includes(monster.id)) : monsters;
        const nextBattle = createGymBattleState(gymProgress.challenge, expeditionTeam, gymProgress.roster);
        setContinent(found);
        setTeam(expeditionTeam);
        setProgress(gymProgress);
        setBattle(nextBattle);
        setActiveActorId(nextBattle.playerField[0]?.unitId ?? null);
      } catch {
        setNotice('挑战书没有准备好，请回到道馆重新选择出战伙伴。');
      }
    });
  }, [adventure, continentId, currentTrainer?.id]);

  const activeActor = useMemo(() => battle?.playerField.find((unit) => unit.unitId === activeActorId) ?? null, [activeActorId, battle]);
  const activeAction = activeActor ? actions[activeActor.unitId] : undefined;
  const activeSkillIndex = activeAction?.type === 'skill' ? activeAction.skillIndex : undefined;
  const activeTargetId = activeAction?.type === 'skill' ? activeAction.targetId : undefined;
  const allPlayersReady = battle ? battle.playerField.every((unit) => Boolean(actions[unit.unitId])) : false;
  const definition = continent ? getGymDefinition(continent.element) : null;

  const chooseSkill = (skillIndex: number) => {
    if (!battle || !activeActor) return;
    const current = actions[activeActor.unitId];
    const defaultTarget = current?.type === 'skill' ? current.targetId : battle.enemyField[0]?.unitId;
    if (!defaultTarget) return;
    setActions((previous) => ({ ...previous, [activeActor.unitId]: { type: 'skill', actorId: activeActor.unitId, targetId: defaultTarget, skillIndex } }));
  };

  const chooseTarget = (targetId: string) => {
    if (!activeActor) return;
    setActions((previous) => {
      const current = previous[activeActor.unitId];
      if (current?.type !== 'skill') return previous;
      return { ...previous, [activeActor.unitId]: { ...current, targetId } };
    });
  };

  const chooseSwitch = (benchId: string) => {
    if (!activeActor || !battle || battle.switchRule !== 'free') return;
    setActions((previous) => ({ ...previous, [activeActor.unitId]: { type: 'switch', actorId: activeActor.unitId, benchId } }));
  };

  const resolveRound = () => {
    if (!battle || !allPlayersReady) {
      setNotice('每只场上伙伴都要选择技能与目标，或者选择换人。');
      return;
    }
    const next = resolveGymRound(battle, Object.values(actions));
    setBattle(next);
    setActions({});
    setActiveActorId(next.playerField[0]?.unitId ?? null);
    setNotice(next.winner ? '' : `第 ${next.round} 回合：继续商量下一步吧。`);
  };

  const finishBattle = async () => {
    if (!battle?.winner || !progress || !adventure || settled) return;
    setSettled(true);
    const challenge = progress.challenge;
    if (!challenge) return;
    if (battle.winner === 'player') {
      const allBadges = await db.badges.toArray();
      const alreadyEarned = allBadges.some((badge) => badge.trainerId === currentTrainer?.id && badge.continentId === adventure.continentId && badge.kind === 'gym');
      if (!alreadyEarned) {
        const badge: Badge = {
          trainerId: currentTrainer?.id,
          continentId: adventure.continentId,
          name: `${definition?.name ?? '属性道馆'}徽章`,
          emoji: '🏅',
          element: continent?.element,
          kind: 'gym',
          earnedAt: new Date(),
        };
        await db.badges.add(badge);
      }
      addTrainerDiamonds(8, currentTrainer?.id);
      setCurrentAdventure({
        ...adventure,
        pendingBattleType: undefined,
        gymProgress: { ...progress, cleared: true, lastResult: 'win', challenge: undefined },
      });
      setNotice(alreadyEarned ? '复赛胜利！获得 8 枚钻石，馆主为你写下新的冒险记录。' : '首次道馆胜利！获得 8 枚钻石，徽章已放进徽章盒，地图 Boss 已解锁。');
    } else {
      const deployedIds = challenge.playerIds;
      const tiredId = deployedIds[Math.floor(Math.random() * deployedIds.length)];
      const tiredMonster = team.find((monster) => monster.id === tiredId);
      if (tiredMonster?.id !== undefined) {
        const fatigueEndTime = new Date(Date.now() + 10 * 60 * 1000);
        await db.monsters.update(tiredMonster.id, { fatigueEndTime });
        setNotice(`${tiredMonster.name}在努力战斗后需要休息 10 分钟。休息结束后再回来挑战吧！`);
      }
      setCurrentAdventure({
        ...adventure,
        pendingBattleType: undefined,
        gymProgress: { ...progress, lastResult: 'loss', challenge: undefined },
      });
    }
  };

  if (!battle || !continent || !progress || !definition) {
    return <div className="min-h-screen grid place-items-center bg-[#171226] px-6 text-center text-lg text-gray-200">{notice || '正在布置道馆战场…'}</div>;
  }

  const renderUnit = (unit: GymBattleState['playerField'][number], side: 'player' | 'enemy') => {
    const avatar = AVATAR_OPTIONS.find((option) => option.id === unit.monster.avatar);
    const selected = side === 'player' && activeActorId === unit.unitId;
    const hpPercent = Math.max(0, Math.min(100, unit.currentHp / (unit.monster.maxHp ?? unit.monster.hp) * 100));
    return (
      <button key={unit.unitId} onClick={() => side === 'player' && setActiveActorId(unit.unitId)} className={`rounded-2xl border-2 p-3 text-left backdrop-blur transition ${selected ? 'border-yellow-300 bg-yellow-200/20 ring-2 ring-yellow-200/60' : side === 'player' ? 'border-cyan-200/60 bg-cyan-950/40' : 'border-rose-200/60 bg-rose-950/40'}`}>
        <div className="flex items-center gap-2"><span className="text-3xl">{avatar?.emoji ?? '❓'}</span><span className="min-w-0 flex-1"><span className="block truncate font-black text-white">{unit.monster.name}</span><MonsterElementBadges monster={unit.monster} badgeClassName="mt-1 text-[10px] font-bold" /></span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${hpPercent}%` }} /></div>
        <p className="mt-1 text-xs font-bold text-white">HP {unit.currentHp}/{unit.monster.maxHp ?? unit.monster.hp}</p>
        {unit.statuses.length > 0 && <p className="mt-1 text-xs text-yellow-100">{unit.statuses.map((status) => getBattleStatusConfig(status.type).emoji).join(' ')}</p>}
        {side === 'player' && actions[unit.unitId] && <p className="mt-1 text-xs font-bold text-yellow-100">✓ {actions[unit.unitId].type === 'switch' ? '准备换人' : '技能已选'}</p>}
      </button>
    );
  };

  return (
    <div className="relative min-h-[100dvh] overflow-auto bg-[#171226] px-3 py-4 text-white">
      <img src={gymArena} alt="手绘卡通道馆战场" className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover" />
      <div className="mx-auto w-full max-w-4xl">
        <header className="rounded-2xl border border-yellow-200/40 bg-[#241a3a]/85 px-4 py-3 text-center shadow-xl backdrop-blur"><p className="text-xs font-bold text-yellow-100">{definition.leaderName}的 {definition.name}</p><h1 className="text-2xl font-black text-yellow-300">{GYM_FORMAT_LABEL[battle.format]} · {GYM_SWITCH_RULE_LABEL[battle.switchRule]}</h1><p className="mt-1 text-sm text-gray-200">第 {battle.round} 回合：为每一只场上伙伴选招与目标</p></header>

        <section className="mt-4 grid gap-3 md:grid-cols-2"><div><p className="mb-2 font-black text-cyan-100">你的场上伙伴</p><div className="grid gap-2">{battle.playerField.map((unit) => renderUnit(unit, 'player'))}</div></div><div><p className="mb-2 font-black text-rose-100">馆主的场上伙伴</p><div className="grid gap-2">{battle.enemyField.map((unit) => renderUnit(unit, 'enemy'))}</div></div></section>

        {!battle.winner && activeActor && (
          <section className="mt-4 rounded-2xl border border-white/20 bg-[#201a3b]/90 p-4 shadow-xl backdrop-blur">
            <p className="font-black text-yellow-200">正在指挥：{activeActor.monster.name}</p>
            <p className="mt-2 text-sm text-gray-200">1. 选择技能　2. 点选要攻击的敌人</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{activeActor.monster.skills.map((skill, index) => <button key={skill.id} onClick={() => chooseSkill(index)} className={`rounded-xl border-2 p-3 text-left ${activeSkillIndex === index ? 'border-yellow-300 bg-yellow-300/20' : 'border-cyan-200/40 bg-cyan-950/30'}`}><b>{skill.name}</b><span className="ml-2 text-xs">威力 {skill.power} · 命中 {skill.accuracy}%</span></button>)}</div>
            <div className="mt-3 flex flex-wrap gap-2">{battle.enemyField.map((enemy) => <button key={enemy.unitId} onClick={() => chooseTarget(enemy.unitId)} disabled={activeAction?.type !== 'skill'} className={`rounded-lg px-3 py-2 text-sm font-bold ${activeTargetId === enemy.unitId ? 'bg-rose-400 text-slate-950' : 'bg-rose-950/80 text-rose-100 disabled:opacity-40'}`}>攻击 {enemy.monster.name}</button>)}</div>
            {battle.switchRule === 'free' && battle.playerBench.length > 0 && <div className="mt-3 border-t border-white/15 pt-3"><p className="text-sm text-cyan-100">或者换上替补（消耗此伙伴本回合行动）</p><div className="mt-2 flex flex-wrap gap-2">{battle.playerBench.map((bench) => <button key={bench.unitId} onClick={() => chooseSwitch(bench.unitId)} className="rounded-lg bg-sky-400/20 px-3 py-2 text-sm font-bold text-sky-100">换上 {bench.monster.name}</button>)}</div></div>}
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-white/20 bg-[#1b1533]/90 p-4 shadow-xl"><p className="font-black text-gray-100">战斗记录</p><div className="mt-2 max-h-40 overflow-auto text-sm leading-6 text-gray-200">{battle.log.slice(-8).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div></section>
        {notice && <p className="mt-3 rounded-xl bg-yellow-300/20 px-3 py-2 text-center text-sm font-bold text-yellow-100">{notice}</p>}
        {battle.winner ? <button onClick={settled ? () => navigate(`/map/${continent.id}`) : finishBattle} className="mt-4 w-full rounded-2xl bg-yellow-400 px-5 py-4 text-lg font-black text-slate-950 shadow-lg hover:bg-yellow-300">{settled ? '返回地图' : battle.winner === 'player' ? '领取徽章并解锁 Boss' : '接受休眠结果'}</button> : <button onClick={resolveRound} disabled={!allPlayersReady} className="mt-4 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-black text-white shadow-lg hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600">⚔️ 确认本回合行动</button>}
      </div>
    </div>
  );
}
