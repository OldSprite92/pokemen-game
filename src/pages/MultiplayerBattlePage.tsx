import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useGameStore } from '../stores/gameStore';
import { getTeamActionTag, TEAM_TAG_LABELS } from '../game/multiplayerRules';
import { applyExp } from '../game/rewardSystem';
import { addTrainerDiamonds } from '../game/trainerInventory';
import { ALL_WILD_MONSTERS, generateWildMonster } from '../game/wildMonsters';
import { BattleAnimation, type BattleVisualState } from '../components/BattleAnimation';
import MonsterElementBadges from '../components/MonsterElementBadges';
import type { ElementType, Monster, PokeBallType } from '../types';

const TAG_COLORS: Record<string, string> = {
  burst: 'border-red-400/60 bg-red-500/15 text-red-100',
  guard: 'border-blue-400/60 bg-blue-500/15 text-blue-100',
  control: 'border-yellow-400/60 bg-yellow-500/15 text-yellow-100',
  support: 'border-green-400/60 bg-green-500/15 text-green-100',
};

const EMPTY_BAG: Record<PokeBallType, number> = { normal: 3, great: 1, ultra: 0, master: 0, legend: 0, transcend: 0 };
const storageKey = (kind: 'reward' | 'capture', battleId: string, trainerId: number) => `pokemonAdventure.multiplayer.${kind}.${battleId}.${trainerId}`;
const STATUS_DISPLAY: Record<string, { emoji: string; label: string }> = {
  burn: { emoji: '🔥', label: '灼伤' }, poison: { emoji: '☠️', label: '中毒' }, paralysis: { emoji: '⚡', label: '麻痹' },
  freeze: { emoji: '❄️', label: '冻住' }, bind: { emoji: '🌿', label: '缠绕' }, fear: { emoji: '🌙', label: '害怕' },
};

export default function MultiplayerBattlePage() {
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const setCurrentTrainer = useGameStore((state) => state.setCurrentTrainer);
  const mp = useMultiplayer();
  const [team, setTeam] = useState<Monster[]>([]);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | undefined>();
  const [targetId, setTargetId] = useState('');
  const [resultLines, setResultLines] = useState<string[]>([]);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const [impact, setImpact] = useState<{ damage: number; synergy: boolean; counter: number } | null>(null);
  const [battleVisual, setBattleVisual] = useState<BattleVisualState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const impactRef = useRef('');
  const battle = mp.teamBattle;
  const me = mp.socketId;
  const hasActed = Boolean(me && battle?.actions?.[me]);
  const opponents = useMemo(() => mp.players.filter((player) => player.id !== me), [mp.players, me]);
  const monster = team.find((item) => item.id === selectedMonsterId) ?? team[0] ?? null;

  useEffect(() => {
    if (!currentTrainer?.id) return;
    void db.monsters.where('trainerId').equals(currentTrainer.id).toArray().then((monsters) => {
      const active = monsters.find((item) => item.id === currentTrainer.activeMonsterId) ?? monsters[0] ?? null;
      setTeam(monsters);
      setSelectedMonsterId((previous) => previous && monsters.some((item) => item.id === previous) ? previous : active?.id);
    });
  }, [currentTrainer?.id, currentTrainer?.activeMonsterId]);

  useEffect(() => { if (!targetId && opponents[0]) setTargetId(opponents[0].id); }, [opponents, targetId]);
  useEffect(() => {
    if (!mp.connected) navigate(mp.continentId ? `/map/${mp.continentId}` : '/');
  }, [mp.connected, mp.continentId, navigate]);
  useEffect(() => { setResultLines([]); setCaptureMessage(null); }, [battle?.battleId]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const result = battle?.lastRound;
    if (!battle || !result) return;
    const token = `${battle.battleId}-${result.round}-${battle.bossHp}`;
    if (impactRef.current === token) return;
    impactRef.current = token;
    setImpact({ damage: result.totalDamage, synergy: result.synergyHit, counter: result.counterDamage });
    const impactTimer = window.setTimeout(() => setImpact(null), 900);
    const counterTimer = result.counterDamage > 0
      ? window.setTimeout(() => {
          setBattleVisual({
            attacker: 'enemy',
            element: (battle.bossElement ?? 'normal') as ElementType,
            skillName: 'Boss 反击',
            didHit: true,
            isCritical: false,
          });
          window.setTimeout(() => setBattleVisual(null), 760);
        }, 420)
      : undefined;
    return () => {
      window.clearTimeout(impactTimer);
      if (counterTimer !== undefined) window.clearTimeout(counterTimer);
    };
  }, [battle?.battleId, battle?.bossElement, battle?.bossHp, battle?.lastRound]);

  useEffect(() => {
    if (!battle || battle.mode !== 'coop' || battle.phase === 'active' || !currentTrainer?.id || !monster) return;
    const key = storageKey('reward', battle.battleId, currentTrainer.id);
    const saved = sessionStorage.getItem(key);
    if (saved) { setResultLines(JSON.parse(saved)); return; }
    const applyResult = async () => {
      if (battle.phase === 'victory') {
        const participant = me ? team.find((item) => item.name === battle.actions?.[me]?.monsterName) ?? monster : monster;
        const exp = Math.max(24, (battle.bossLevel ?? participant.level) * 10 + (battle.lastRound?.synergyHit ? 8 : 0));
        const { monster: rewarded, leveledUp } = applyExp(participant, exp);
        if (participant.id !== undefined) {
          await db.monsters.update(participant.id, {
            level: rewarded.level, exp: rewarded.exp, expToNext: rewarded.expToNext, maxHp: rewarded.maxHp,
            hp: rewarded.hp, attack: rewarded.attack, defense: rewarded.defense, speed: rewarded.speed, skills: rewarded.skills,
          });
          setTeam((previous) => previous.map((item) => item.id === participant.id ? rewarded : item));
        }
        const bagKey = `pokeballs_trainer_${currentTrainer.id}`;
        const bag = { ...EMPTY_BAG, ...(JSON.parse(localStorage.getItem(bagKey) || 'null') || {}) };
        bag.normal += 1;
        localStorage.setItem(bagKey, JSON.stringify(bag));
        const diamonds = 6 + (battle.lastRound?.synergyHit ? 2 : 0);
        addTrainerDiamonds(diamonds, currentTrainer.id);
        await db.diaryEntries.add({
          trainerId: currentTrainer.id,
          continentId: mp.continentId ?? 'multiplayer',
          title: '共同远征高光',
          text: battle.lastRound?.synergyHit
            ? `${participant.name}和伙伴们打出默契合击，击败了${battle.bossName ?? '共同 Boss'}！`
            : `${participant.name}与伙伴们一起击败了${battle.bossName ?? '共同 Boss'}，完成了一次共同远征。`,
          createdAt: new Date(),
        });
        const lines = [`${participant.name} 获得 ${exp} 经验`, '获得精灵球 × 1', `获得 💎 ${diamonds} 枚钻石`, ...(leveledUp ? [`${participant.name} 升级到 Lv.${rewarded.level}！`] : [])];
        sessionStorage.setItem(key, JSON.stringify(lines));
        setResultLines(lines);
      } else {
        const fatigueEndTime = new Date(Date.now() + 2 * 60 * 1000);
        if (monster.id !== undefined) {
          await db.monsters.update(monster.id, { fatigueEndTime });
          setTeam((previous) => previous.map((item) => item.id === monster.id ? { ...item, fatigueEndTime } : item));
        }
        const lines = [`${monster.name} 累了，需要休息 2 分钟`, '这次没有获得战利品；下次可试试换伙伴或凑默契合击。'];
        sessionStorage.setItem(key, JSON.stringify(lines));
        setResultLines(lines);
      }
    };
    void applyResult();
  }, [battle, currentTrainer?.id, me, monster, team]);

  if (!battle) return <div className="team-battle-page flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-xl font-bold text-yellow-200">正在和房主同步战场...</p><p className="text-sm text-gray-400">请保持在同一个 WiFi，战斗状态马上就会出现。</p><button onClick={() => navigate('/')} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-bold text-gray-200">返回单人冒险</button></div>;

  const isCoop = battle.mode === 'coop';
  const bossPercent = battle.bossMaxHp ? Math.max(0, (battle.bossHp ?? 0) / battle.bossMaxHp * 100) : 0;
  const teamPercent = battle.teamMaxHp ? Math.max(0, (battle.teamHp ?? 0) / battle.teamMaxHp * 100) : 0;
  const playerHp = battle.playerHp ?? {};
  const scores = battle.scores ?? {};
  const winner = mp.players.find((player) => player.id === battle.winnerId);
  const secondsLeft = battle.phase === 'active' && battle.roundDeadlineAt
    ? Math.max(0, Math.ceil((battle.roundDeadlineAt - now) / 1000))
    : null;
  const submitSkill = (skillIndex: number) => {
    const skill = monster?.skills[skillIndex];
    if (!skill || hasActed || battle.phase !== 'active') return;
    setBattleVisual({ attacker: 'player', element: skill.element, skillName: skill.name, didHit: true, isCritical: false });
    window.setTimeout(() => setBattleVisual(null), 760);
    mp.sendBattleAction({ tag: getTeamActionTag(skill.element), skillName: skill.name, monsterName: monster?.name, skillElement: skill.element, accuracy: skill.accuracy, power: skill.power, targetId: isCoop ? undefined : targetId });
  };
  const exitMultiplayer = () => {
    if (mp.roomId) mp.leaveRoom(mp.roomId);
    if (isCoop && mp.continentId) navigate(`/map/${mp.continentId}`); else navigate('/');
  };
  const leaveBattle = () => { if (isCoop && mp.continentId) navigate(`/map/${mp.continentId}`); else navigate('/multiplayer'); };
  const captureBoss = async () => {
    if (!currentTrainer?.id || !battle.captureAvailable || captureMessage) return;
    const key = storageKey('capture', battle.battleId, currentTrainer.id);
    if (localStorage.getItem(key)) { setCaptureMessage('这位伙伴已经加入你的队伍了。'); return; }
    const config = ALL_WILD_MONSTERS.find((item) => item.monster.name === battle.bossName);
    const element = (battle.bossElement ?? 'normal') as ElementType;
    const caught: Monster = config
      ? { ...generateWildMonster(config), level: battle.bossLevel ?? config.monster.level, createdBy: 'user', trainerId: currentTrainer.id, createdAt: new Date() }
      : { name: battle.bossName ?? '远征伙伴', element, elements: [element], avatar: battle.bossAvatar ?? 'mystery', level: battle.bossLevel ?? 1, hp: 72, maxHp: 72, attack: 52, defense: 48, speed: 45, exp: 0, expToNext: 100, skills: monster?.skills.slice(0, 3) ?? [], description: '在共同远征中被大家的勇气打动，决定一起冒险。', createdBy: 'user', trainerId: currentTrainer.id, createdAt: new Date() };
    const caughtId = await db.monsters.add(caught);
    setCurrentTrainer({ ...currentTrainer, monsterIds: [...currentTrainer.monsterIds, caughtId as number] });
    setTeam((previous) => [...previous, { ...caught, id: caughtId as number }]);
    localStorage.setItem(key, '1');
    setCaptureMessage(`${caught.name} 被共同冒险打动，加入队伍了！`);
  };

  return <div className="team-battle-page flex min-h-[100dvh] flex-col gap-4 p-4">
    <BattleAnimation visual={battleVisual} />
    {impact && <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-live="polite"><div className={`rounded-2xl border-2 px-6 py-4 text-center shadow-2xl animate-bounce ${impact.synergy ? 'border-yellow-300 bg-yellow-500/90 text-gray-950' : 'border-red-300 bg-red-600/90 text-white'}`}><p className="text-2xl font-black">{impact.synergy ? '✨ 默契合击！' : '💥 命中！'}</p><p className="text-lg font-bold">Boss -{impact.damage} HP{impact.counter > 0 ? ` · 队伍 -${impact.counter}` : ''}</p></div></div>}
    <div className="team-battle-topbar sticky top-0 z-40 flex items-center justify-between gap-2 bg-[#1a1a2e]/95 py-2 backdrop-blur"><button onClick={() => navigate('/multiplayer')} className="text-sm font-bold text-blue-300">← 房间</button><div className="text-center"><h1 className="text-lg font-bold text-yellow-300 pixel-title">{isCoop ? '共同 Boss 战' : '友谊斗技'}</h1><p className="text-xs text-gray-400">第 {battle.round ?? 1} 回合{secondsLeft !== null && <span className={`ml-2 font-bold ${secondsLeft <= 5 ? 'text-red-300' : 'text-cyan-200'}`}>· {secondsLeft} 秒</span>}</p></div><button onClick={exitMultiplayer} className="rounded-md border border-red-400/70 px-2 py-1 text-xs font-bold text-red-200">退出联机</button></div>
    {isCoop ? <section className={`pixel-border rounded-xl bg-red-950/35 p-4 transition-transform duration-200 ${impact ? 'scale-[1.02] ring-2 ring-red-300/70' : ''}`}><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-red-100">{battle.bossName ?? '远征守卫'} <span className="text-xs text-red-200/70">Lv.{battle.bossLevel ?? battle.monsterLevel ?? 1}</span></p><MonsterElementBadges monster={{ element: (battle.bossElement ?? 'normal') as ElementType, elements: (battle.bossElements ?? [battle.bossElement ?? 'normal']) as ElementType[] }} badgeClassName="mt-1 text-xs font-bold" /><p className="mt-1 text-xs text-yellow-100/85">本回合默契目标：{(battle.requiredTags ?? []).map((tag) => TEAM_TAG_LABELS[tag as keyof typeof TEAM_TAG_LABELS] ?? tag).join(' + ')} <span className="text-yellow-300">（凑齐伤害 +45%）</span></p></div><p className="text-sm font-bold text-red-100">{battle.bossHp} / {battle.bossMaxHp}</p></div><div className="mt-2 h-4 overflow-hidden rounded-full bg-gray-900"><div className="h-full bg-red-500 transition-[width] duration-700" style={{ width: `${bossPercent}%` }} /></div>{battle.bossIntent && <div className="mt-3 rounded-lg border border-orange-300/50 bg-orange-500/10 p-2 text-sm"><b className="text-orange-100">{battle.bossIntent.emoji} Boss 意图：{battle.bossIntent.label}</b><p className="mt-1 text-xs text-orange-100/85">{battle.bossIntent.description}</p></div>}{(battle.bossStatuses?.length ?? 0) > 0 && <div className="mt-2 flex flex-wrap gap-1">{battle.bossStatuses?.map((status) => <span key={status.type} className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-100">{STATUS_DISPLAY[status.type]?.emoji} {STATUS_DISPLAY[status.type]?.label} {status.turnsRemaining}回合</span>)}</div>}<div className="mt-3 flex items-center justify-between text-sm text-blue-100"><span>远征体力</span><span>{battle.teamHp} / {battle.teamMaxHp}</span></div><div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-900"><div className="h-full bg-blue-500 transition-[width] duration-700" style={{ width: `${teamPercent}%` }} /></div><div className="mt-3 flex items-center justify-between rounded-lg bg-pink-500/10 px-2 py-2 text-sm"><span className="font-bold text-pink-100">💞 默契能量 {battle.teamEnergy ?? 0}/3</span>{battle.rescueAvailable && <button onClick={() => mp.rescueTeam()} className="rounded bg-pink-400 px-3 py-1 text-xs font-black text-[#38112d]">紧急救援</button>}</div></section> : <section className="pixel-border rounded-xl bg-yellow-950/25 p-4"><p className="text-sm font-bold text-yellow-100">先获得 {battle.targetScore} 枚斗技星获胜。多人集火同一位训练师时，伤害会自动降低。</p></section>}
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{mp.players.map((player) => { const action = battle.actions?.[player.id]; const statuses = battle.playerStatuses?.[player.id] ?? []; return <div key={player.id} className={`rounded-lg border p-3 ${player.id === me ? 'border-yellow-400 bg-yellow-500/10' : 'border-gray-700 bg-gray-900/70'}`}><div className="flex items-center justify-between"><span className="font-bold">{player.name}</span><span className={action ? 'text-green-300' : 'text-gray-400'}>{action ? `准备${TEAM_TAG_LABELS[action.tag as keyof typeof TEAM_TAG_LABELS] ?? '行动'}` : '正在思考'}</span></div>{!isCoop && <p className="mt-1 text-xs text-gray-300">HP {playerHp[player.id] ?? 100} · 斗技星 {scores[player.id] ?? 0}</p>}{isCoop && action && <p className="mt-2 text-xs text-gray-300">{action.monsterName ?? '伙伴'} · {action.skillName} <span className={`ml-1 inline-block rounded-md border px-1.5 py-0.5 font-bold ${TAG_COLORS[action.tag ?? 'burst']}`}>{TEAM_TAG_LABELS[action.tag as keyof typeof TEAM_TAG_LABELS]}</span></p>}{isCoop && statuses.length > 0 && <p className="mt-2 text-xs text-purple-100">{statuses.map((status) => `${STATUS_DISPLAY[status.type]?.emoji ?? '✨'} ${STATUS_DISPLAY[status.type]?.label ?? status.type} ${status.turnsRemaining}回合`).join(' · ')}</p>}</div>; })}</section>
    <section className="battle-log pixel-border rounded-xl bg-gray-900/75 p-3" aria-live="polite">{(battle.log ?? ['等待远征开始。']).slice(-4).map((entry, index) => <p className="py-0.5 text-sm text-gray-200" key={`${entry}-${index}`}>› {entry}</p>)}</section>
    {battle.phase === 'active' && <section className="mt-auto"><div className="mb-3 rounded-xl border border-gray-700 bg-gray-900/70 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-gray-100">本回合出战伙伴</p><p className="text-xs text-gray-400">{hasActed ? '行动后下回合可换人' : '可随时换人'}</p></div><div className="flex gap-2 overflow-x-auto pb-1">{team.map((item) => <button key={item.id ?? item.name} disabled={hasActed} onClick={() => setSelectedMonsterId(item.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-sm font-bold disabled:opacity-50 ${monster?.id === item.id ? 'border-yellow-400 bg-yellow-500/15 text-yellow-100' : 'border-gray-600 bg-gray-800 text-gray-200'}`}><span className="mr-1">{item.avatar}</span>{item.name}<span className="ml-1 text-xs text-gray-400">Lv.{item.level}</span></button>)}</div></div>{!isCoop && <div className="mb-3 flex flex-wrap gap-2">{opponents.map((player) => <button key={player.id} onClick={() => setTargetId(player.id)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${targetId === player.id ? 'border-yellow-400 bg-yellow-500 text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-200'}`}>目标：{player.name}</button>)}</div>}<p className="mb-2 text-sm font-bold text-gray-200">{hasActed ? '已提交行动，等待伙伴。' : `${monster?.name ?? '伙伴'}，选择本回合技能`}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{(monster?.skills ?? []).slice(0, 4).map((skill, index) => { const tag = getTeamActionTag(skill.element); return <button key={skill.id} disabled={hasActed} onClick={() => submitSkill(index)} className={`rounded-lg border p-3 text-left transition active:scale-[0.98] disabled:opacity-50 ${TAG_COLORS[tag]}`}><div className="flex justify-between gap-2"><span className="font-bold">{skill.name}</span><span>{TEAM_TAG_LABELS[tag]}</span></div><p className="mt-1 text-xs opacity-80">威力 {skill.power} · 命中 {skill.accuracy}%</p></button>; })}</div></section>}
    {battle.phase !== 'active' && <section className="pixel-border rounded-xl bg-gray-800 p-5 text-center"><h2 className="text-2xl font-bold text-yellow-300">{isCoop ? (battle.phase === 'victory' ? '远征胜利！' : '暂时撤退') : `${winner?.name ?? '训练师'} 获胜`}</h2>{isCoop && <div className="mt-3 space-y-1 text-left text-sm text-gray-200">{resultLines.length ? resultLines.map((line) => <p key={line}>🎁 {line}</p>) : <p>正在结算本次远征...</p>}</div>}{isCoop && battle.phase === 'victory' && battle.capturePhase !== 'complete' && <div className="mt-4 rounded-xl border border-purple-300/40 bg-purple-500/10 p-3"><p className="text-sm font-bold text-purple-100">共同捕获 · {battle.capturePhase === 'throw' ? '第二步：一起投球' : '第一步：一起安抚'}</p><p className="mt-1 text-xs text-purple-100/80">已有 {Object.keys(battle.captureVotes ?? {}).length}/{mp.players.length} 位伙伴准备好了。</p><button onClick={() => mp.sendCaptureAction(battle.capturePhase === 'throw' ? 'throw' : 'calm')} className="mt-3 rounded-lg bg-purple-500 px-5 py-3 font-bold text-white active:scale-[0.98]">{battle.capturePhase === 'throw' ? '🎯 我也投球' : '🤝 我来安抚'}</button></div>}{isCoop && battle.phase === 'victory' && battle.capturePhase === 'complete' && <button onClick={() => void captureBoss()} className="mt-4 rounded-lg bg-purple-500 px-5 py-3 font-bold text-white active:scale-[0.98]">✨ 邀请 {battle.bossName ?? 'Boss'} 加入队伍</button>}{captureMessage && <p className="mt-2 font-bold text-green-300">{captureMessage}</p>}<div className="mt-4 flex justify-center gap-2"><button onClick={leaveBattle} className="rounded-lg bg-green-500 px-5 py-3 font-bold text-white active:scale-[0.98]">继续冒险</button><button onClick={exitMultiplayer} className="rounded-lg border border-red-400 px-5 py-3 font-bold text-red-200 active:scale-[0.98]">退出联机</button></div></section>}
  </div>;
}
