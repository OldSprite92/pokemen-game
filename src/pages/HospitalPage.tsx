import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import MonsterElementBadges from '../components/MonsterElementBadges';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { getHospitalCost, getRecoverableMaxHp, getTrainerDiamonds, spendTrainerDiamonds } from '../game/trainerInventory';
import type { Monster } from '../types';

export default function HospitalPage() {
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [diamonds, setDiamonds] = useState(0);
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (currentTrainer?.id === undefined) {
      setMonsters([]);
      setDiamonds(0);
      return;
    }
    const list = await db.monsters.where('trainerId').equals(currentTrainer.id).toArray();
    setMonsters(list);
    setDiamonds(getTrainerDiamonds(currentTrainer.id));
  };

  useEffect(() => { void load(); }, [currentTrainer?.id]);

  const admit = async (monster: Monster) => {
    if (monster.id === undefined || currentTrainer?.id === undefined) return;
    const maxHp = getRecoverableMaxHp(monster);
    const needsCare = monster.hp < maxHp || (monster.fatigueEndTime && new Date(monster.fatigueEndTime) > new Date());
    if (!needsCare) {
      setNotice(`${monster.name}状态很好，今天不用住院。`);
      return;
    }
    const cost = getHospitalCost(monster);
    if (!spendTrainerDiamonds(cost, currentTrainer.id)) {
      setNotice(`钻石不够：治疗 ${monster.name} 需要 ${cost} 枚钻石。去地图找宝箱或战胜对手吧！`);
      return;
    }
    await db.monsters.update(monster.id, { hp: maxHp, maxHp, fatigueEndTime: undefined });
    setNotice(`${monster.name}完成治疗：HP 已回满，休眠也解除了！`);
    await load();
  };

  if (!currentTrainer) {
    return <div className="grid min-h-[100dvh] place-items-center bg-[#171226] p-6 text-center text-gray-100"><div><p className="text-xl font-black">先创建训练师，医院才知道该照顾谁。</p><Link to="/trainer" className="mt-4 inline-block font-bold text-blue-300">去创建训练师 →</Link></div></div>;
  }

  return (
    <div className="min-h-[100dvh] bg-[#171226] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="font-bold text-blue-300">← 返回主页</Link>
          <Link to="/backpack" className="rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100">背包 · 💎 {diamonds}</Link>
        </div>
        <section className="mt-4 rounded-3xl border-2 border-rose-300/60 bg-[#322447] p-5 shadow-xl">
          <p className="text-sm font-black text-rose-200">伙伴照护中心</p>
          <h1 className="mt-1 text-3xl font-black">宝可梦医院</h1>
          <p className="mt-2 text-sm leading-6 text-gray-100">选择一只伙伴住院治疗。治疗会回满 HP、解除休眠；费用会从训练师背包的钻石中扣除。</p>
          <p className="mt-3 rounded-xl bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100">💎 当前钻石：{diamonds}</p>
        </section>

        {notice && <p className="mt-4 rounded-xl border border-yellow-300/40 bg-yellow-400/10 p-3 text-sm font-bold text-yellow-100">{notice}</p>}

        <div className="mt-4 grid gap-3">
          {monsters.map((monster) => {
            const avatar = AVATAR_OPTIONS.find((option) => option.id === monster.avatar);
            const maxHp = getRecoverableMaxHp(monster);
            const sleeping = !!monster.fatigueEndTime && new Date(monster.fatigueEndTime) > new Date();
            const needsCare = monster.hp < maxHp || sleeping;
            const cost = getHospitalCost(monster);
            return <article key={monster.id} className="rounded-2xl border border-white/15 bg-[#272036] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#3b2d52] text-2xl">{avatar?.emoji ?? '？'}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-lg font-black">{monster.name}</p><MonsterElementBadges monster={monster} badgeClassName="mt-1 text-[11px] font-bold" /><p className="mt-1 text-sm text-gray-200">HP {monster.hp}/{maxHp}{sleeping ? ' · 休眠中' : ''}</p></div>
              </div>
              <button onClick={() => void admit(monster)} disabled={!needsCare || diamonds < cost} className="mt-3 w-full rounded-xl border border-rose-200/70 bg-[#c94952] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700">
                {needsCare ? `送入医院治疗 · 💎 ${cost}` : '状态很好，不需要治疗'}
              </button>
            </article>;
          })}
          {monsters.length === 0 && <p className="rounded-xl bg-white/10 p-4 text-center text-gray-200">还没有伙伴需要照顾。</p>}
        </div>
      </div>
    </div>
  );
}
