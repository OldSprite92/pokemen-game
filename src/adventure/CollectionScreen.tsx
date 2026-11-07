import { useState } from "react";
import { movesFor, BALLS, BALL_IDS } from "./journey";
import { progress, combatStat } from "./engine";
import { SPECIES, SPECIES_LIST, AREAS } from "./data";
import {
  canEvolve,
  maxHp,
  xpToNext,
  type GameState,
  type GameAction,
} from "./engine";
import {
  ActionButton,
  Health,
  Icon,
  Item,
  Sprite,
  TypeTag,
} from "./components";

export function TeamPanel({
  game,
  act,
  initialId,
}: {
  game: GameState;
  act: (a: GameAction) => void;
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId || game.leaderId);
  const selected =
      game.roster.find((c) => c.id === selectedId) || game.roster[0],
    species = SPECIES[selected.speciesId];
  const inTeam = game.teamIds.includes(selected.id),
    full = game.teamIds.length >= 6,
    activeBattle = game.battle?.status === "active";
  return (
    <div className="team-panel">
      <div className="companion-detail">
        <div className="companion-meadow">
          <Sprite id={selected.speciesId} />
          {selected.id === game.leaderId && (
            <span className="following-label">
              <Icon name="foot" />
              跟随中
            </span>
          )}
        </div>
        <div className="companion-description">
          <div className="companion-heading">
            <h3>{species.name}</h3>
            <TypeTag type={species.type} />
            <span>Lv. {selected.level}</span>
          </div>
          <Health creature={selected} />
          <div className="xp-row">
            <span>成长</span>
            <progress
              value={selected.xp}
              max={xpToNext(selected.level)}
              aria-label="升级经验"
            />
            <small>
              {selected.xp}/{xpToNext(selected.level)}
            </small>
          </div>
          <p>{species.description}</p>
          <dl className="combat-stats">
            {(
              [
                ["attack", "攻击"],
                ["defense", "防御"],
                ["spAttack", "特攻"],
                ["spDefense", "特防"],
                ["speed", "速度"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{combatStat(selected, key)}</dd>
              </div>
            ))}
          </dl>
          <div className="known-moves">
            {movesFor(selected.speciesId, selected.learned).map((move) => (
              <span key={move.id}>
                <TypeTag type={move.type} />
                {move.name}
              </span>
            ))}
          </div>
          <div className="companion-actions">
            {activeBattle ? (
              <ActionButton
                primary
                disabled={
                  !inTeam ||
                  selected.hp <= 0 ||
                  game.battle?.activeId === selected.id
                }
                onClick={() => act({ type: "switch", creatureId: selected.id })}
              >
                换它上场
              </ActionButton>
            ) : (
              <>
                <ActionButton
                  primary
                  icon={<Icon name="foot" />}
                  disabled={!inTeam || selected.id === game.leaderId}
                  onClick={() =>
                    act({ type: "setLeader", creatureId: selected.id })
                  }
                >
                  {selected.id === game.leaderId ? "正在一起走" : "一起走"}
                </ActionButton>
                <ActionButton
                  icon={<Icon name={inTeam ? "home" : "heart"} />}
                  disabled={inTeam ? game.teamIds.length === 1 : full}
                  onClick={() =>
                    act({ type: "toggleTeam", creatureId: selected.id })
                  }
                >
                  {inTeam ? "留在营地" : "加入队伍"}
                </ActionButton>
              </>
            )}
            <ActionButton
              icon={<Item name="oran-berry" />}
              disabled={game.berries === 0 || selected.hp >= maxHp(selected)}
              onClick={() => act({ type: "berry", creatureId: selected.id })}
            >
              喂树果
            </ActionButton>
            {canEvolve(selected) && !activeBattle && (
              <ActionButton
                className="evolve-button"
                icon={<Icon name="spark" />}
                onClick={() => act({ type: "evolve", creatureId: selected.id })}
              >
                进化成{SPECIES[species.evolution!.id].name}
              </ActionButton>
            )}
          </div>
          {!inTeam && full && (
            <p className="help-text">
              队伍满了。先让一位伙伴留在营地，就能带上它。
            </p>
          )}
        </div>
      </div>
      <div className="roster-heading">
        <h3>
          所有伙伴 <span>{game.roster.length}</span>
        </h3>
        <span>队伍 {game.teamIds.length}/6</span>
      </div>
      <div className="roster-grid">
        {game.roster.map((c) => (
          <button
            type="button"
            className={`roster-choice ${c.id === selected.id ? "selected" : ""}`}
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            aria-pressed={c.id === selected.id}
          >
            <Sprite id={c.speciesId} decorative />
            <strong>{SPECIES[c.speciesId].name}</strong>
            <small>
              Lv. {c.level} ·{" "}
              {game.teamIds.includes(c.id) ? "在队伍" : "在营地"}
            </small>
            {canEvolve(c) && (
              <span className="evolution-dot" aria-label="可以进化" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
export function BagPanel({
  game,
  act,
}: {
  game: GameState;
  act: (a: GameAction) => void;
}) {
  return (
    <div className="bag-panel">
      <div className="bag-items">
        <div className="bag-item">
          <Item name="poke-ball" />
          <h3>精灵球</h3>
          <strong>持有 {progress(game).balls.poke} 个</strong>
          <p>捕捉时选择球种；商城可补充。</p>
        </div>
        <div className="bag-item">
          <Item name="oran-berry" />
          <h3>树果</h3>
          <strong>还剩 {game.berries} 颗</strong>
          <p>给伙伴恢复体力。回营地可以补充。</p>
        </div>
      </div>
      <h3 className="bag-heading">把树果喂给谁？</h3>
      {game.battle?.status === "active" && (
        <p className="help-text berry-battle-rule">
          喂树果会用掉一回合，对方也会行动。
        </p>
      )}
      <div className="berry-targets">
        {game.teamIds.map((id) => {
          const c = game.roster.find((c) => c.id === id)!;
          return (
            <button
              type="button"
              key={id}
              className="berry-target"
              disabled={game.berries === 0 || c.hp === maxHp(c)}
              onClick={() => act({ type: "berry", creatureId: id })}
            >
              <Sprite id={c.speciesId} decorative />
              <strong>{SPECIES[c.speciesId].name}</strong>
              <Health creature={c} />
              <span>
                {c.hp === maxHp(c)
                  ? "精神满满"
                  : game.berries === 0
                    ? "树果用完了"
                    : "喂一颗树果"}
              </span>
            </button>
          );
        })}
      </div>
      {!game.battle && (
        <ActionButton
          icon={<Icon name="home" />}
          onClick={() => {
            act({ type: "travel", area: "camp" });
            act({ type: "heal" });
          }}
        >
          回营地休息
        </ActionButton>
      )}
    </div>
  );
}
export function DexPanel({ game }: { game: GameState }) {
  const [selected, setSelected] = useState(game.roster[0].speciesId);
  const caught = new Set(game.caughtSpeciesIds),
    seen = game.seen.includes(selected),
    species = SPECIES[selected];
  return (
    <div className="dex-panel">
      <div className="dex-summary">
        <Icon name="book" />
        <span>每一次相遇，都值得记住</span>
        <strong>
          {caught.size} / {SPECIES_LIST.length}
        </strong>
      </div>
      <div className="dex-selected">
        <Sprite
          id={selected}
          className={!seen && !caught.has(selected) ? "silhouette" : ""}
        />
        <div>
          <span className="eyebrow">
            NO. {String(selected).padStart(3, "0")}
          </span>
          <h3>
            {seen || caught.has(selected) ? species.name : "还没见过的伙伴"}
          </h3>
          <p>
            {seen || caught.has(selected)
              ? species.description
              : "继续探索小岛，期待你们的第一次相遇。"}
          </p>
          <span className="dex-discovery">
            {caught.has(selected)
              ? "已成为伙伴"
              : seen
                ? "已经见过"
                : "等待发现"}
            {(seen || caught.has(selected)) &&
              ` · ${species.habitat.map((a) => AREAS[a].name).join("、")}`}
          </span>
        </div>
      </div>
      <div className="dex-grid">
        {SPECIES_LIST.map((s) => {
          const known = game.seen.includes(s.id) || caught.has(s.id);
          return (
            <button
              type="button"
              key={s.id}
              className={`dex-choice ${selected === s.id ? "selected" : ""}`}
              onClick={() => setSelected(s.id)}
              aria-pressed={selected === s.id}
              aria-label={
                known ? `查看${s.name}` : `查看第${s.id}号未发现宝可梦`
              }
            >
              <span className="dex-number">
                {String(s.id).padStart(3, "0")}
              </span>
              <Sprite
                id={s.id}
                decorative
                className={known ? "" : "silhouette"}
              />
              <strong>{known ? s.name : "???"}</strong>
              {caught.has(s.id) && <Icon name="check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
