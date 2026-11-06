import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PokeballImage from '../components/PokeballImage';
import { POKEBALL_CONFIG } from '../game/catchSystem';
import { POKEBALL_DROP_RATES } from '../game/rewardSystem';
import {
  buyShopPokeball,
  getShopLockReason,
  SHOP_POKEBALL_PRODUCTS,
} from '../game/shop';
import { getStoredPokeBalls, getTrainerDiamonds } from '../game/trainerInventory';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import type { Badge, PokeBallType } from '../types';

function chunkProducts<T>(products: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < products.length; index += size) {
    rows.push(products.slice(index, index + size));
  }
  return rows;
}

export default function ShopPage() {
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [diamonds, setDiamonds] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [inventory, setInventory] = useState<Record<PokeBallType, number> | null>(null);
  const [quantities, setQuantities] = useState<Record<PokeBallType, number>>({
    normal: 1,
    great: 1,
    ultra: 1,
    master: 1,
    legend: 1,
    transcend: 1,
  });
  const [notice, setNotice] = useState('');
  const productRows = useMemo(() => chunkProducts(SHOP_POKEBALL_PRODUCTS, 2), []);

  useEffect(() => {
    const load = async () => {
      if (currentTrainer?.id === undefined) return;
      setDiamonds(getTrainerDiamonds(currentTrainer.id));
      setInventory(getStoredPokeBalls(currentTrainer.id));
      setBadges(await db.badges.where('trainerId').equals(currentTrainer.id).toArray());
    };
    void load();
  }, [currentTrainer?.id]);

  if (currentTrainer?.id === undefined) {
    return (
      <div className="shop-page grid min-h-[100dvh] place-items-center px-6 text-center text-white">
        <div>
          <p className="text-xl font-black">先创建训练师，店员才能打开你的背包。</p>
          <Link to="/trainer" className="mt-4 inline-block font-black text-cyan-200">去创建训练师 →</Link>
        </div>
      </div>
    );
  }

  const buy = (type: PokeBallType) => {
    const product = SHOP_POKEBALL_PRODUCTS.find((item) => item.type === type);
    if (!product) return;
    const result = buyShopPokeball(currentTrainer.id!, product, quantities[type], badges);
    setNotice(result.message);
    setDiamonds(result.diamonds);
    setInventory(result.pokeballs);
  };

  return (
    <div className="shop-page min-h-[100dvh] px-4 pb-10 pt-5 text-white">
      <main className="mx-auto w-full max-w-2xl">
        <nav className="shop-top-nav">
          <Link to="/" className="shop-back-link">← 返回主页</Link>
          <Link to="/backpack" className="shop-bag-link">查看背包</Link>
        </nav>

        <header className="shop-signboard">
          <p className="shop-signboard-small">TRAINER SUPPLY</p>
          <h1>精灵球补给铺</h1>
          <p>{currentTrainer.name}，挑好后店员会直接放进你的背包。</p>
          <div className="shop-diamond-counter" aria-live="polite">
            <span>当前钻石</span>
            <strong>💎 {diamonds.toLocaleString('zh-CN')}</strong>
          </div>
        </header>

        {notice && <p className="shop-notice" role="status">{notice}</p>}

        <section className="shop-cabinet" aria-label="精灵球商品货架">
          <div className="shop-clerk-line">
            <span aria-hidden="true">🔔</span>
            <p>难度越高，稀有球的战斗掉率越高；商店价格按长期存档重新定价。</p>
          </div>

          {productRows.map((row, rowIndex) => (
            <div className="shop-shelf-row" key={`shelf-${rowIndex}`}>
              {row.map((product) => {
                const config = POKEBALL_CONFIG[product.type];
                const quantity = quantities[product.type];
                const totalPrice = product.price * quantity;
                const lockReason = getShopLockReason(product, badges);
                const shortage = Math.max(0, totalPrice - diamonds);
                return (
                  <article className={`shop-shelf-item ${lockReason ? 'is-locked' : ''}`} key={product.type}>
                    <div className="shop-ball-stage">
                      <PokeballImage type={product.type} alt={`${config.name}图片`} />
                    </div>
                    <h2>{config.name}</h2>
                    <p className="shop-catch-power">捕获加成 ×{config.catchRateMultiplier.toFixed(1)}</p>
                    <p className="shop-drop-line">
                      掉率 简{POKEBALL_DROP_RATES.easy[product.type]}% · 困{POKEBALL_DROP_RATES.hard[product.type]}% · 狱{POKEBALL_DROP_RATES.hell[product.type]}%
                    </p>

                    <div className="shop-price-tag">
                      <span>单价</span>
                      <strong>💎 {product.price.toLocaleString('zh-CN')}</strong>
                    </div>

                    {product.quantities.length > 1 && !lockReason && (
                      <div className="shop-quantity" aria-label={`${config.name}购买数量`}>
                        {product.quantities.map((amount) => (
                          <button
                            type="button"
                            key={amount}
                            className={quantity === amount ? 'is-selected' : ''}
                            onClick={() => setQuantities((current) => ({ ...current, [product.type]: amount }))}
                            aria-pressed={quantity === amount}
                          >
                            ×{amount}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      className="shop-buy-button"
                      disabled={Boolean(lockReason) || shortage > 0}
                      onClick={() => buy(product.type)}
                    >
                      {lockReason ?? (shortage > 0
                        ? `还差 💎 ${shortage.toLocaleString('zh-CN')}`
                        : `购买 ×${quantity} · 💎 ${totalPrice.toLocaleString('zh-CN')}`)}
                    </button>
                    <p className="shop-owned">背包已有 ×{inventory?.[product.type] ?? 0}</p>
                  </article>
                );
              })}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
