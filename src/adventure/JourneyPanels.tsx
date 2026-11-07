import { useState } from "react";
import { AREAS, AREA_ORDER, SPECIES } from "./data";
import {
  canTravel,
  canWalk,
  progress,
  maxHp,
  type GameAction,
  type GameState,
} from "./engine";
import {
  BALLS,
  BALL_IDS,
  DISCS,
  DISC_MOVES,
  canLearn,
  movesFor,
  trainersFor,
} from "./journey";
import { ActionButton, Sprite, Icon } from "./components";

export function JourneyMap({
  game,
  act,
  onClose,
}: {
  game: GameState;
  act: (a: GameAction) => void;
  onClose: () => void;
}) {
  const p = progress(game);
  return (
    <div className="journey-map-grid">
      {AREA_ORDER.map((id) => (
        <button
          type="button"
          key={id}
          className={game.area === id ? "current-city" : ""}
          disabled={!canWalk(game, id)}
          onClick={() => {
            act({ type: "travel", area: id });
            onClose();
          }}
        >
          <Icon name={id === "camp" ? "home" : "compass"} />
          <strong>{AREAS[id].name}</strong>
          <small>{AREAS[id].subtitle}</small>
          <span>
            {game.area === id
              ? "你在这里"
              : canWalk(game, id)
                ? "步行前往"
                : canTravel(game, id)
                  ? "可在机场乘机直达"
                  : id === "secret"
                    ? `钥匙碎片 ${p.fragments.length}/3 · 需要星岩徽章`
                    : "击败上一城守护者后开放"}
          </span>
          {game.badges.includes(id) && <span>已获得徽章</span>}
        </button>
      ))}
    </div>
  );
}
export function TrainerPanel({
  game,
  id,
  act,
  onClose,
}: {
  game: GameState;
  id: string;
  act: (a: GameAction) => void;
  onClose: () => void;
}) {
  const trainer = trainersFor(game.area).find((t) => t.id === id);
  if (!trainer) return null;
  const beaten = progress(game).trainers.includes(id);
  return (
    <div className="trainer-dialog">
      <img
        src="/game/characters/red.png"
        alt={trainer.name}
        width="80"
        height="80"
      />
      <h3>{trainer.name}</h3>
      <p>{trainer.dialogue}</p>
      <div className="trainer-team">
        {trainer.species.map((species, i) => (
          <div key={i}>
            <Sprite id={species} />
            <strong>{SPECIES[species].name}</strong>
            <small>Lv. {trainer.level}</small>
          </div>
        ))}
      </div>
      <p>
        {beaten
          ? "再战奖励：25 金币"
          : `首胜奖励：${trainer.coins} 金币${trainer.fragment ? "与一片地图钥匙" : ""}`}
      </p>
      <p className="help-text">对手的宝可梦不能捕捉。挑战开始后需完成对战。</p>
      <ActionButton
        primary
        onClick={() => {
          act({ type: "encounter", trainerId: id });
          onClose();
        }}
      >
        接受挑战
      </ActionButton>
      <ActionButton onClick={onClose}>下次再切磋</ActionButton>
    </div>
  );
}
export function ShopPanel({
  game,
  act,
}: {
  game: GameState;
  act: (a: GameAction) => void;
}) {
  const [tab, setTab] = useState<"items" | "learn" | "fly">("items");
  const [selected, setSelected] = useState(game.leaderId);
  const [slot, setSlot] = useState(0);
  const p = progress(game),
    c = game.roster.find((c) => c.id === selected) || game.roster[0];
  return (
    <div className="shop-panel">
      <div className="shop-wallet">
        <strong>金币 {p.coins}</strong>
        <span>地图钥匙 {p.fragments.length}/3</span>
      </div>
      <div className="shop-tabs" aria-label="商城分类">
        {(["items", "learn", "fly"] as const).map((id, i) => (
          <button
            type="button"
            aria-pressed={tab === id}
            key={id}
            onClick={() => setTab(id)}
          >
            {["购买补给", "学习招式", "机场"][i]}
          </button>
        ))}
      </div>
      {tab === "items" && (
        <div className="shop-grid">
          {BALL_IDS.filter((id) => id !== "master").map((id) => (
            <article key={id}>
              <span className={`ball-token ball-${id}`} aria-hidden="true" />
              <h3>{BALLS[id].name}</h3>
              <p>{BALLS[id].note}</p>
              <small>持有 {p.balls[id]}</small>
              <ActionButton
                disabled={p.coins < BALLS[id].price}
                onClick={() => act({ type: "buy", item: id })}
              >
                {BALLS[id].price} 金币兑换
              </ActionButton>
            </article>
          ))}
          {[
            {
              id: "berry",
              name: "树果",
              note: "恢复45%体力",
              price: 25,
              count: game.berries,
            },
            {
              id: "food",
              name: "营养餐",
              note: "恢复60%体力，解除异常状态",
              price: 45,
              count: p.food,
            },
            {
              id: "ticket",
              name: "机票",
              note: "直接飞往一座已开放城市",
              price: 70,
              count: p.tickets,
            },
          ].map((item) => (
            <article key={item.id}>
              <Icon name={item.id === "ticket" ? "compass" : "heart"} />
              <h3>{item.name}</h3>
              <p>{item.note}</p>
              <small>持有 {item.count}</small>
              <ActionButton
                disabled={p.coins < item.price}
                onClick={() => act({ type: "buy", item: item.id })}
              >
                {item.price} 金币兑换
              </ActionButton>
            </article>
          ))}
        </div>
      )}
      {tab === "learn" && (
        <>
          <p>
            学习器兑换后可重复使用。按种类与等级学习，替换你选择的一个招式。
          </p>
          <label className="journey-field">
            选择伙伴
            <select
              name="partner"
              value={c.id}
              onChange={(e) => {
                setSelected(e.target.value);
                setSlot(0);
              }}
            >
              {game.roster.map((c) => (
                <option value={c.id} key={c.id}>
                  {SPECIES[c.speciesId].name} Lv.{c.level}
                </option>
              ))}
            </select>
          </label>
          <label className="journey-field">
            替换招式
            <select
              name="move-slot"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
            >
              {movesFor(c.speciesId, c.learned).map((m, i) => (
                <option key={i} value={i}>
                  {i + 1}. {m.name}
                </option>
              ))}
              {movesFor(c.speciesId, c.learned).length < 4 && (
                <option value={movesFor(c.speciesId, c.learned).length}>
                  添加到空招式栏
                </option>
              )}
            </select>
          </label>
          <div className="shop-grid">
            {DISCS.map((d) => (
              <article key={d.id}>
                <h3>{DISC_MOVES[d.id].name}</h3>
                <p>
                  Lv.{d.minLevel} 起 ·{" "}
                  {d.species.map((id) => SPECIES[id].name).join("、")}
                </p>
                {p.discs.includes(d.id) ? (
                  <ActionButton
                    disabled={!canLearn(c.speciesId, c.level, d.id)}
                    onClick={() =>
                      act({
                        type: "learn",
                        creatureId: c.id,
                        discId: d.id,
                        slot,
                      })
                    }
                  >
                    {canLearn(c.speciesId, c.level, d.id)
                      ? "学习并替换"
                      : "种类或等级不符合"}
                  </ActionButton>
                ) : (
                  <ActionButton
                    disabled={p.coins < d.price}
                    onClick={() => act({ type: "buy", item: d.id })}
                  >
                    {d.price} 金币兑换
                  </ActionButton>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "fly" && (
        <>
          <p>
            持有 {p.tickets}{" "}
            张机票。只能飞往已开放的城市；相邻城市可通过地图免费步行。
          </p>
          <div className="journey-map-grid">
            {AREA_ORDER.filter((id) => id !== "camp" && id !== "secret").map(
              (id) => (
                <ActionButton
                  key={id}
                  disabled={
                    !canTravel(game, id) || p.tickets === 0 || game.area === id
                  }
                  onClick={() => act({ type: "fly", area: id })}
                >
                  飞往{AREAS[id].name}
                </ActionButton>
              ),
            )}
          </div>
        </>
      )}
      <p className="panel-feedback" role="status">
        {game.events[game.events.length - 1]?.message}
      </p>
    </div>
  );
}
export function FoodPanel({
  game,
  act,
}: {
  game: GameState;
  act: (a: GameAction) => void;
}) {
  const p = progress(game);
  return (
    <section className="food-panel">
      <h3>营养餐 · 持有 {p.food} 份</h3>
      <p>恢复60%体力并解除异常状态。战斗中会消耗一回合。</p>
      {(game.battle?.status === "active"
        ? game.roster.filter((c) => c.id === game.battle?.activeId)
        : game.roster.filter((c) => game.teamIds.includes(c.id))
      ).map((c) => (
        <ActionButton
          key={c.id}
          disabled={
            p.food === 0 || (c.hp >= maxHp(c) && !c.status && !c.confusion)
          }
          onClick={() => act({ type: "food", creatureId: c.id })}
        >
          给{SPECIES[c.speciesId].name}吃营养餐
        </ActionButton>
      ))}
    </section>
  );
}
