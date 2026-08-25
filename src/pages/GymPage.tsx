import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import MonsterElementBadges from '../components/MonsterElementBadges';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import gymChallengeScroll from '../assets/gym/gym-challenge-scroll.svg';
import gymLeaderFrame from '../assets/gym/gym-leader-frame.svg';
import {
  createGymChallenge,
  createGymProgress,
  getGymDefinition,
  GYM_FORMAT_LABEL,
  GYM_SWITCH_RULE_LABEL,
  gymRuleExplanation,
} from '../game/gymSystem';
import { normalizeDifficulty } from '../game/mapDifficulty';
import type { Continent, GymProgress, Monster } from '../types';

export default function GymPage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const currentAdventure = useGameStore((state) => state.currentAdventure);
  const setCurrentAdventure = useGameStore((state) => state.setCurrentAdventure);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [team, setTeam] = useState<Monster[]>([]);
  const [progress, setProgress] = useState<GymProgress | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!continentId || currentTrainer?.id === undefined) return;
    void Promise.all([
      db.continents.where('id').equals(continentId).first(),
      db.monsters.where('trainerId').equals(currentTrainer.id).toArray(),
    ]).then(([found, monsters]) => {
      if (!found) return;
      setContinent(found);
      const partyIds = currentAdventure?.continentId === found.id ? currentAdventure.mapPartyIds : undefined;
      const expeditionTeam = partyIds?.length ? monsters.filter((monster) => monster.id !== undefined && partyIds.includes(monster.id)) : monsters;
      setTeam(expeditionTeam);
      const existing = currentAdventure?.continentId === found.id ? currentAdventure.gymProgress : undefined;
      const nextProgress = existing?.continentId === found.id
        ? existing
        : createGymProgress(found, normalizeDifficulty(currentAdventure?.difficulty));
      const challenge = nextProgress.challenge ?? createGymChallenge(nextProgress, expeditionTeam);
      const normalizedProgress = { ...nextProgress, challenge };
      setProgress(normalizedProgress);
      if (currentAdventure?.continentId === found.id && (!existing || !existing.challenge)) {
        setCurrentAdventure({ ...currentAdventure, gymProgress: normalizedProgress });
      }
    });
  }, [continentId, currentAdventure, currentTrainer?.id, setCurrentAdventure]);

  const readyTeam = useMemo(
    () => team.filter((monster) => !monster.fatigueEndTime || new Date(monster.fatigueEndTime) <= new Date()),
    [team],
  );
  const challenge = progress?.challenge;
  const definition = continent ? getGymDefinition(continent.element) : null;
  const opponentIds = new Set(challenge?.opponentIds ?? []);
  const selectedCount = challenge ? challenge.format + (challenge.switchRule === 'free' ? 1 : 0) : 0;

  const toggleMonster = (monsterId?: number) => {
    if (monsterId === undefined || !challenge) return;
    setSelectedIds((previous) => {
      if (previous.includes(monsterId)) return previous.filter((id) => id !== monsterId);
      if (previous.length >= selectedCount) return previous;
      return [...previous, monsterId];
    });
  };

  const startChallenge = () => {
    if (!currentAdventure || !progress || !challenge) return;
    if (selectedIds.length !== selectedCount) {
      const reserveHint = challenge.switchRule === 'free' ? '（含 1 只替补）' : '';
      setMessage(`这场是 ${GYM_FORMAT_LABEL[challenge.format]}，请选择 ${selectedCount} 只可以出战的伙伴${reserveHint}。`);
      return;
    }
    const nextProgress: GymProgress = {
      ...progress,
      attempts: progress.attempts + 1,
      challenge: { ...challenge, playerIds: selectedIds },
    };
    setCurrentAdventure({ ...currentAdventure, gymProgress: nextProgress, pendingBattleType: 'gym' });
    navigate(`/gym-battle/${continentId}`);
  };

  if (!continent || !progress || !challenge || !definition) {
    return <div className="min-h-screen grid place-items-center text-lg text-gray-300">正在展开馆主的挑战书…</div>;
  }

  const element = ELEMENT_CONFIG[continent.element];
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#1a1028] px-4 pb-32 pt-5 text-white">
      <div className="mx-auto w-full max-w-xl">
        <button onClick={() => navigate(`/map/${continent.id}`)} className="mb-3 font-bold text-blue-300 hover:text-blue-200">← 回到地图</button>
        <section className="relative isolate overflow-hidden rounded-[28px] border-4 border-[#5e354f] bg-[#f7d89c] px-5 pb-7 pt-7 text-[#3b2440] shadow-2xl sm:px-6">
          {/* 卷轴只作装饰纹理，纸张底色始终覆盖整张挑战书，内容再长也不会被拉伸变形。 */}
          <img src={gymChallengeScroll} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
          <div className="flex items-start gap-4">
            <div className="relative h-28 w-24 shrink-0">
              <img src={gymLeaderFrame} alt="馆主肖像框" className="h-full w-full" />
              <div className="absolute inset-0 grid place-items-center px-3 pt-1 text-center">
                <span className="text-2xl">{element?.emoji}</span>
                <span className="text-xs font-black">{definition.leaderName}</span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs font-bold tracking-[.22em] text-[#8a4f4b]">{definition.leaderTitle}</p>
              <h1 className="mt-1 text-3xl font-black text-[#542d4f]">{definition.name}</h1>
              <p className="mt-2 text-sm font-bold">馆主 {definition.leaderName}：{definition.greeting}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-[#8d5b4d]/55 bg-[#fff8e3] p-4 shadow-inner">
            <p className="text-sm font-black text-[#8a4f4b]">本次随机挑战规则（已锁定）</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#5d375b] px-3 py-3 text-center text-[#fff4ca] shadow-sm">
                <div className="text-xs opacity-80">同时上场</div>
                <div className="text-xl font-black">{GYM_FORMAT_LABEL[challenge.format]}</div>
              </div>
              <div className="rounded-xl bg-[#395d68] px-3 py-3 text-center text-[#e7fbff] shadow-sm">
                <div className="text-xs opacity-80">换人规则</div>
                <div className="text-xl font-black">{GYM_SWITCH_RULE_LABEL[challenge.switchRule]}</div>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-6">{gymRuleExplanation(challenge.switchRule)}</p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-black text-[#8a4f4b]">馆内阵容 · {progress.roster.length} 只</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {progress.roster.map((member) => {
                const isOpponent = opponentIds.has(member.id);
                return (
                  <div key={member.id} className={`rounded-xl border-2 p-2 ${isOpponent ? 'border-[#ca7a45] bg-[#ffe8ac]' : 'border-[#a37a69]/45 bg-[#fff8e3]'}`}>
                    <p className="font-black">{isOpponent ? '本次出战 · ' : ''}{member.monster.name}</p>
                    <MonsterElementBadges monster={member.monster} badgeClassName="mt-1 text-[11px] font-bold" />
                    <p className="mt-1 text-xs">Lv.{member.monster.level}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-black text-[#8a4f4b]">选择 {selectedCount} 只出战伙伴{challenge.switchRule === 'free' ? '（前排 + 1 只替补）' : ''}</p>
            <div className="mt-2 grid gap-2">
              {readyTeam.map((monster) => {
                const selected = monster.id !== undefined && selectedIds.includes(monster.id);
                const avatar = AVATAR_OPTIONS.find((option) => option.id === monster.avatar);
                return (
                  <button key={monster.id} onClick={() => toggleMonster(monster.id)} className={`flex items-center gap-3 rounded-xl border-2 p-2 text-left transition ${selected ? 'border-[#ca7a45] bg-[#ffe6a4]' : 'border-[#a37a69]/45 bg-[#fff8e3]'}`}>
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#432a58] text-xl">{avatar?.emoji ?? '❓'}</span>
                    <span className="flex-1"><span className="font-black">{monster.name}</span><MonsterElementBadges monster={monster} badgeClassName="ml-2 text-[11px] font-bold" /></span>
                    <span className="font-black">{selected ? '✓ 已选' : '选择'}</span>
                  </button>
                );
              })}
              {readyTeam.length === 0 && <p className="rounded-xl bg-[#fff0c5] p-3 text-sm font-bold">所有伙伴都在休息，等它们恢复后再来吧。</p>}
            </div>
          </div>
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-[#f5ce77]/50 bg-[#1a1028]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_26px_rgba(8,5,18,.45)] backdrop-blur">
        <div className="mx-auto w-full max-w-xl">
          {message && <p role="alert" className="mb-2 rounded-lg bg-[#842f45] px-3 py-2 text-center text-sm font-bold text-white">{message}</p>}
          <button onClick={startChallenge} disabled={readyTeam.length < selectedCount} className="w-full rounded-xl border-2 border-[#ffe59a] bg-[#c94952] px-5 py-4 text-lg font-black text-white shadow-lg transition hover:bg-[#dc5963] active:scale-[.98] disabled:cursor-not-allowed disabled:border-[#b59a91] disabled:bg-[#9f8078]">
            {progress.cleared ? '🏅 开始复赛' : '⚔️ 接受馆主挑战'} <span className="ml-1 text-sm text-white/85">({selectedIds.length}/{selectedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
