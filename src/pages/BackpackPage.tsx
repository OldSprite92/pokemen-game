import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { GymBadgeEmblem, SuperBadgeEmblem } from '../components/GymBadgeEmblem';
import { getStoredPokeBalls, getStoredSkillStones, getTrainerDiamonds, type StoredSkillStone } from '../game/trainerInventory';
import { POKEBALL_CONFIG } from '../game/catchSystem';
import type { Badge, Monster, PokeBallType } from '../types';
import PokeballImage from '../components/PokeballImage';

export default function BackpackPage() {
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [diamonds, setDiamonds] = useState(0);
  const [balls, setBalls] = useState<Record<PokeBallType, number> | null>(null);
  const [stones, setStones] = useState<StoredSkillStone[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);

  useEffect(() => {
    const load = async () => {
      if (currentTrainer?.id === undefined) return;
      setDiamonds(getTrainerDiamonds(currentTrainer.id));
      setBalls(getStoredPokeBalls(currentTrainer.id));
      setStones(getStoredSkillStones(currentTrainer.id));
      setBadges(await db.badges.where('trainerId').equals(currentTrainer.id).toArray());
      setMonsters(await db.monsters.where('trainerId').equals(currentTrainer.id).toArray());
    };
    void load();
  }, [currentTrainer?.id]);

  return (
    <div className="min-h-[100dvh] bg-[#171226] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between gap-2"><Link to="/" className="font-bold text-blue-300">← 返回主页</Link><div className="flex gap-2"><Link to="/shop" className="rounded-xl bg-amber-500/20 px-3 py-2 text-sm font-black text-amber-100">去商店</Link><Link to="/hospital" className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-black text-rose-100">去医院</Link></div></div>
        <section className="mt-4 rounded-3xl border-2 border-yellow-300/50 bg-[#302442] p-5 shadow-xl"><p className="text-sm font-black text-yellow-200">{currentTrainer?.name ?? '训练师'}的收藏</p><h1 className="mt-1 text-3xl font-black">训练师背包</h1><div className="mt-4 rounded-2xl bg-cyan-400/10 p-4"><p className="text-sm text-cyan-100">可用钻石</p><p className="mt-1 text-3xl font-black text-cyan-100">💎 {diamonds}</p><p className="mt-1 text-xs text-cyan-100/80">地图宝箱和战斗胜利都会放入这里。</p></div></section>

        <Link to="/warehouse" className="mt-4 flex items-center justify-between rounded-2xl border-2 border-violet-300/50 bg-[#34244a] p-4 shadow-lg transition active:scale-[0.98] hover:bg-[#413057]"><span><span className="block text-lg font-black text-violet-100">宝可梦仓库</span><span className="mt-1 block text-sm text-violet-100/80">管理孩子已经拥有的所有伙伴</span></span><span className="rounded-xl bg-violet-400/20 px-3 py-2 text-lg font-black text-violet-100">{monsters.length} 只 →</span></Link>

        <section className="mt-4 rounded-2xl border border-white/15 bg-[#272036] p-4"><h2 className="text-lg font-black text-yellow-100">精灵球</h2><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(POKEBALL_CONFIG).map(([type, config]) => <div key={type} className="flex items-center gap-3 rounded-xl bg-black/15 p-3"><PokeballImage type={type as PokeBallType} alt="" className="h-10 w-10" /><div><p className="font-bold">{config.name}</p><p className="mt-1 text-2xl font-black text-white">× {balls?.[type as PokeBallType] ?? 0}</p></div></div>)}</div></section>

        <section className="mt-4 rounded-2xl border border-white/15 bg-[#272036] p-4"><h2 className="text-lg font-black text-yellow-100">技能石 · {stones.length}</h2>{stones.length === 0 ? <p className="mt-2 text-sm text-gray-300">还没有技能石。战胜野生伙伴有机会获得。</p> : <div className="mt-3 flex flex-wrap gap-2">{stones.map((stone) => { const info = ELEMENT_CONFIG[stone.element]; return <span key={stone.id} className="rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: `${info.color}35`, color: info.color }}>{info.emoji} {info.label}技能石</span>; })}</div>}</section>

        <section className="mt-4 rounded-2xl border border-white/15 bg-[#272036] p-4">
          <h2 className="text-lg font-black text-yellow-100">道馆徽章 · {badges.length}</h2>
          {badges.length === 0 ? <p className="mt-2 text-sm text-gray-300">还没有徽章，去属性道馆挑战吧！</p> : (
            <div className="mt-3 grid gap-2">
              {badges.map((badge) => (
                <div key={badge.id} className={`flex items-center gap-3 rounded-xl p-3 ${badge.kind === 'super' ? 'bg-violet-500/15' : 'bg-black/15'}`}>
                  {badge.kind === 'gym' && badge.element ? <GymBadgeEmblem element={badge.element} size="2.5rem" /> : <SuperBadgeEmblem size="2.5rem" />}
                  <span className="font-bold">{badge.name}</span>
                  {badge.kind === 'super' && <span className="ml-auto text-xs font-bold text-violet-100">{badge.usedAt ? '已使用' : '可在徽章页使用'}</span>}
                  {badge.element && <span className="ml-auto text-sm" style={{ color: ELEMENT_CONFIG[badge.element].color }}>{ELEMENT_CONFIG[badge.element].emoji} {ELEMENT_CONFIG[badge.element].label}</span>}
                </div>
              ))}
            </div>
          )}
          <Link to="/pokedex" className="mt-3 block text-center text-sm font-black text-yellow-200 hover:text-yellow-100">查看徽章与合成勋章 →</Link>
        </section>
      </div>
    </div>
  );
}
