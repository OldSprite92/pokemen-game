import { useState } from "react";
import { AREAS, SPECIES, effectiveness, type Element } from "./data";
import {
  progress,
  typeEffectiveness,
  isAdventureComplete,
  type GameState,
  type GameAction,
} from "./engine";
import { SPECIES_STATS } from "./species-stats";
import { BALLS, BALL_IDS, STATUS_NAMES, movesFor } from "./journey";
import {
  ActionButton,
  Health,
  Icon,
  Item,
  Sprite,
  TypeTag,
  type IconName,
} from "./components";

const MOVE_ICONS: Record<Element, IconName> = {
  electric: "spark",
  fire: "fire",
  water: "water",
  grass: "leaf",
  bug: "leaf",
  rock: "rock",
  flying: "compass",
  poison: "moon",
  normal: "shield",
  ice: "water",
  fighting: "spark",
  ground: "rock",
  psychic: "spark",
  ghost: "moon",
  dragon: "fire",
  dark: "moon",
  steel: "shield",
  fairy: "heart",
};

interface BattleScreenProps {
  game: GameState;
  act: (action: GameAction) => void;
  onBag: () => void;
  onCompanion: () => void;
  onContinue: () => void;
}
function MoveBurst({
  type,
  enemy = false,
}: {
  type: Element;
  enemy?: boolean;
}) {
  return (
    <svg
      className={`move-burst ${enemy ? "from-enemy" : ""}`}
      data-element={type}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <g className="burst-projectile">
        {type === "electric" ? (
          <path d="M66 6 27 66h28l-8 48 45-68H64Z" />
        ) : type === "water" || type === "ice" ? (
          <>
            <path d="M60 8C50 29 24 53 24 77a36 36 0 0 0 72 0C96 53 70 29 60 8Z" />
            <path className="burst-highlight" d="M42 65Q30 91 61 98" />
          </>
        ) : type === "fire" ? (
          <path d="M63 5C79 38 105 49 101 81c-5 41-76 48-83 3-4-27 17-39 20-59 12 16 12 28 17 32 12-14 15-30 8-52Z" />
        ) : type === "grass" || type === "bug" ? (
          <>
            <ellipse
              cx="44"
              cy="45"
              rx="16"
              ry="32"
              transform="rotate(-40 44 45)"
            />
            <ellipse
              cx="82"
              cy="78"
              rx="15"
              ry="32"
              transform="rotate(40 82 78)"
            />
          </>
        ) : type === "rock" || type === "ground" ? (
          <>
            <path d="m23 23 32-12 23 31-19 29-35-9Z" />
            <path d="m71 71 25-5 15 23-20 21-25-12Z" />
          </>
        ) : (
          <>
            <circle cx="60" cy="60" r="30" />
            <path d="m60 6 9 27 29-8-15 27 25 16-29 5 2 29-21-19-21 19 2-29-29-5 25-16-15-27 29 8Z" />
          </>
        )}
      </g>
      <circle className="burst-ring" cx="60" cy="60" r="44" />
    </svg>
  );
}

export function BattleScreen({
  game,
  act,
  onBag,
  onCompanion,
  onContinue,
}: BattleScreenProps) {
  const [menu, setMenu] = useState<"main" | "moves" | "team" | "balls">("main");
  const battle = game.battle!;
  const active =
    game.roster.find((creature) => creature.id === battle.activeId) ||
    game.roster.find((creature) => creature.id === game.leaderId)!;
  const enemy = battle.enemy;
  const own = SPECIES[active.speciesId];
  const opponent = SPECIES[enemy.speciesId];
  const attackEvent = game.events.find(
    (event) => event.kind === "attack" && event.actor === "player",
  );
  const attackSpecies = attackEvent?.speciesId
    ? SPECIES[attackEvent.speciesId]
    : undefined;
  const attackMove = attackSpecies
    ? movesFor(attackSpecies.id, active.learned).find((move) =>
        attackEvent?.message.includes(move.name),
      )
    : undefined;
  const enemyEvent = game.events.find(
    (event) => event.kind === "damage" && event.actor === "enemy",
  );
  const enemyMove = movesFor(enemy.speciesId).find((m) =>
    enemyEvent?.message.includes(m.name),
  );
  const p = progress(game);
  const justAttacked = !!attackEvent;
  const enemyAttacked = game.events.some(
    (event) => event.kind === "damage" && event.actor === "enemy",
  );
  const catchFailed = game.events.some((event) => event.kind === "catch-fail");
  const messages = game.events.filter((event) =>
    [
      "message",
      "catch-fail",
      "level-up",
      "loss",
      "win",
      "damage",
      "attack",
      "heal",
    ].includes(event.kind),
  );
  const message =
    messages[messages.length - 1]?.message ||
    (battle.catchReady && battle.kind === "wild"
      ? "好机会！试试精灵球吧。"
      : "轮到" + own.name + "了，准备好了吗？");

  function choose(action: GameAction) {
    setMenu("main");
    act(action);
  }

  const complete = battle.status !== "active";
  if (complete) {
    const caught = battle.status === "caught";
    const won = battle.status === "won";
    const lost = battle.status === "lost";
    const newBadge = won && !!battle.newBadge;
    const joinedTeam =
      !!battle.caughtId && game.teamIds.includes(battle.caughtId);
    const resultTitle = caught
      ? "遇见新伙伴！"
      : lost
        ? "回营地歇一歇"
        : newBadge
          ? "获得冒险徽章！"
          : "太棒了，赢啦！";
    const resultMessage = caught
      ? joinedTeam
        ? "已经加入队伍，一起去看看吧。"
        : "正在营地等你，给它一个队伍位置吧。"
      : lost
        ? "伙伴和发现都在。恢复体力就能继续。"
        : game.events.find((event) => event.kind === "level-up")?.message ||
          (battle.kind === "boss" && !newBadge
            ? "再次赢得了守护者的认可，伙伴也获得了经验！"
            : "伙伴获得了经验，也变得更勇敢了。");

    return (
      <main
        id="game-content"
        className={
          "battle-screen result-screen" +
          (battle.area === "cave" ? " cave-battle" : "")
        }
      >
        <div className="battle-backdrop" />
        <div className="result-panel">
          <span className="eyebrow">
            {caught
              ? "又一段友谊，开始了"
              : lost
                ? "休息好了，再来一次"
                : newBadge
                  ? "你们是很棒的搭档"
                  : "配合得真不错"}
          </span>
          <h1>{resultTitle}</h1>
          <div className="result-pokemon">
            <span className="celebration-rays" aria-hidden="true" />
            <Sprite
              id={caught ? enemy.speciesId : active.speciesId}
              className={caught ? "new-friend" : ""}
            />
            {caught && (
              <span className="capture-success-ball" aria-hidden="true">
                <Item name="poke-ball" />
              </span>
            )}
            {newBadge && (
              <div className={"reward-badge badge-" + battle.area}>
                <Icon
                  name={
                    battle.area === "meadow"
                      ? "leaf"
                      : battle.area === "lake"
                        ? "water"
                        : "rock"
                  }
                />
              </div>
            )}
          </div>
          <h2>
            {caught
              ? opponent.name
              : newBadge
                ? AREAS[battle.area].badgeName
                : own.name}
          </h2>
          <p role="status">{resultMessage}</p>
          <div className="result-actions">
            <ActionButton
              primary
              icon={<Icon name={lost ? "home" : "foot"} />}
              onClick={onContinue}
            >
              {lost ? "回到营地" : "继续冒险"}
            </ActionButton>
            {!lost && (
              <ActionButton icon={<Icon name="heart" />} onClick={onCompanion}>
                {caught ? "看看新伙伴" : "看看伙伴"}
              </ActionButton>
            )}
          </div>
          {battle.rewardCoins !== undefined && (
            <p className="battle-reward">
              获得 {battle.rewardCoins} 金币 · 当前 {p.coins} 金币
            </p>
          )}
          {isAdventureComplete(game) && won && (
            <p className="island-complete">
              <Icon name="flag" />
              六座城市的挑战完成了！隐藏地图还在等待发现。
            </p>
          )}
        </div>
      </main>
    );
  }

  const otherPartner = game.roster.find(
    (creature) => creature.id === game.teamIds.find((id) => id !== active.id),
  );

  return (
    <main
      id="game-content"
      className={
        "battle-screen" + (battle.area === "cave" ? " cave-battle" : "")
      }
      aria-label={own.name + "与" + opponent.name + "对战"}
    >
      <div className="battle-backdrop" />
      <div className="battle-stage">
        <div className="battle-context">
          <span className="area-dot" />
          {battle.kind === "boss"
            ? AREAS[battle.area].bossName
            : battle.kind === "trainer"
              ? "训练家挑战"
              : "野生宝可梦出现了"}
          {battle.kind !== "wild" && (
            <span>对方还剩 {(battle.remaining?.length || 0) + 1} 只</span>
          )}
          <span>第 {battle.turn + 1} 回合</span>
        </div>

        <div className="battle-status enemy-status">
          <div>
            <strong>{opponent.name}</strong>
            <span>Lv. {enemy.level}</span>
          </div>
          <Health creature={enemy} />
          {(SPECIES_STATS[enemy.speciesId]?.types || [opponent.type]).map(
            (type) => (
              <TypeTag key={type} type={type as Element} />
            ),
          )}
          {!!(enemy.status || enemy.confusion) && (
            <span className="status-chip">
              {enemy.status ? STATUS_NAMES[enemy.status] : ""}
              {enemy.confusion ? " 混乱" : ""}
            </span>
          )}
        </div>

        <div className="enemy-position">
          {attackMove && (
            <MoveBurst key={"burst-" + game.revision} type={attackMove.type} />
          )}
          {enemyMove && (
            <span
              key={"enemy-call-" + game.revision}
              className="enemy-move-callout"
              role="status"
            >
              {opponent.name} · {enemyMove.name}
            </span>
          )}
          {!!(enemy.status || enemy.confusion) && (
            <span
              className={
                "condition-aura condition-" + (enemy.status || "confusion")
              }
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          )}
          <div
            key={"enemy-" + game.revision}
            className={
              "battle-sprite-wrap" + (enemyAttacked ? " enemy-attack" : "")
            }
          >
            <Sprite
              id={enemy.speciesId}
              className={"enemy-sprite" + (justAttacked ? " take-hit" : "")}
            />
          </div>
          {attackMove && attackSpecies && (
            <>
              <div
                key={"effect-" + game.revision}
                className="move-effect"
                data-element={attackMove.type}
                aria-hidden="true"
              >
                <span>
                  <Icon name={MOVE_ICONS[attackMove.type]} />
                </span>
                <span>
                  <Icon name={MOVE_ICONS[attackMove.type]} />
                </span>
                <span>
                  <Icon name={MOVE_ICONS[attackMove.type]} />
                </span>
              </div>
              <span
                key={"callout-" + game.revision}
                className="move-callout"
                role="status"
              >
                <small>{attackSpecies.name}</small>
                <strong>{attackMove.name}</strong>
              </span>
            </>
          )}
          {battle.catchReady && battle.kind === "wild" && (
            <span className="catch-cue">
              <Item name="poke-ball" />
              好机会
            </span>
          )}
          {catchFailed && (
            <span key={game.revision} className="throw-ball" aria-hidden="true">
              <Item name="poke-ball" />
            </span>
          )}
        </div>

        <div className="player-position">
          {enemyMove && (
            <MoveBurst
              key={"counter-burst-" + game.revision}
              type={enemyMove.type}
              enemy
            />
          )}
          {enemyMove && (
            <div
              key={"enemy-fx-" + game.revision}
              className="move-effect enemy-move-effect"
              data-element={enemyMove.type}
              aria-hidden="true"
            >
              <span>
                <Icon name={MOVE_ICONS[enemyMove.type]} />
              </span>
              <span>
                <Icon name={MOVE_ICONS[enemyMove.type]} />
              </span>
              <span>
                <Icon name={MOVE_ICONS[enemyMove.type]} />
              </span>
            </div>
          )}
          {!!(active.status || active.confusion) && (
            <span
              className={
                "condition-aura condition-" + (active.status || "confusion")
              }
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          )}
          <div
            key={"player-" + game.revision}
            className={
              "battle-sprite-wrap" + (justAttacked ? " player-attack" : "")
            }
          >
            <Sprite
              id={active.speciesId}
              back
              className={"player-sprite" + (enemyAttacked ? " player-hit" : "")}
            />
          </div>
        </div>

        <div className="battle-status player-status">
          <div>
            <strong>{own.name}</strong>
            <span>Lv. {active.level}</span>
          </div>
          <Health creature={active} />
          {!!(active.status || active.confusion) && (
            <span className="status-chip">
              {active.status ? STATUS_NAMES[active.status] : ""}
              {active.confusion ? " 混乱" : ""}
            </span>
          )}
          <div className="battle-team-dots" aria-label="出战队伍">
            {game.teamIds.map((id) => {
              const creature = game.roster.find(
                (partner) => partner.id === id,
              )!;
              const state =
                creature.hp <= 0
                  ? "需要休息"
                  : id === active.id
                    ? "正在出战"
                    : "准备好了";
              return (
                <span
                  key={id}
                  className={
                    creature.hp <= 0
                      ? "tired"
                      : id === active.id
                        ? "active"
                        : ""
                  }
                  role="img"
                  aria-label={SPECIES[creature.speciesId].name + "，" + state}
                >
                  <Item name="poke-ball" />
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <section className="battle-console" aria-label="战斗操作">
        <div className="battle-message">
          <Sprite id={active.speciesId} decorative />
          <p role="status">{message}</p>
          <button
            type="button"
            className="console-bag"
            onClick={onBag}
            aria-label="打开背包使用树果"
          >
            <Item name="explorer-kit" />
          </button>
        </div>

        {menu === "moves" ? (
          <div className="move-options">
            {movesFor(active.speciesId, active.learned).map((move, index) => {
              const multiplier = typeEffectiveness(move.type, enemy);
              return (
                <button
                  type="button"
                  key={move.id}
                  className={"move-button move-" + move.type}
                  onClick={() =>
                    choose({ type: "attack", moveIndex: index as 0 | 1 })
                  }
                >
                  <TypeTag type={move.type} />
                  <strong>{move.name}</strong>
                  <small>
                    {move.power === 0 ? "状态招式" : `威力 ${move.power}`} ·
                    命中 {move.accuracy}%
                    {multiplier > 1
                      ? " · 克制"
                      : multiplier === 0
                        ? " · 无效"
                        : multiplier < 1
                          ? " · 效果较弱"
                          : ""}
                  </small>
                </button>
              );
            })}
            <button
              type="button"
              className="back-action"
              onClick={() => setMenu("main")}
            >
              <Icon name="close" />
              返回
            </button>
          </div>
        ) : menu === "balls" ? (
          <div className="ball-options">
            {BALL_IDS.map((id) => (
              <button
                type="button"
                key={id}
                disabled={p.balls[id] <= 0}
                onClick={() => choose({ type: "catch", ball: id })}
              >
                <span className={"ball-token ball-" + id} />
                <strong>
                  {BALLS[id].name} ×{p.balls[id]}
                </strong>
                <small>{BALLS[id].note}</small>
              </button>
            ))}
            <button
              type="button"
              className="back-action"
              onClick={() => setMenu("main")}
            >
              返回
            </button>
          </div>
        ) : menu === "team" ? (
          <div className="switch-options">
            {game.teamIds.map((id) => {
              const creature = game.roster.find(
                (partner) => partner.id === id,
              )!;
              return (
                <button
                  type="button"
                  className="switch-choice"
                  key={id}
                  disabled={id === active.id || creature.hp <= 0}
                  onClick={() => choose({ type: "switch", creatureId: id })}
                >
                  <Sprite id={creature.speciesId} decorative />
                  <strong>{SPECIES[creature.speciesId].name}</strong>
                  <small>
                    {id === active.id
                      ? "正在出战"
                      : creature.hp <= 0
                        ? "需要休息"
                        : "换它上场"}
                  </small>
                </button>
              );
            })}
            <button
              type="button"
              className="back-action"
              onClick={() => setMenu("main")}
            >
              <Icon name="close" />
              返回
            </button>
          </div>
        ) : (
          <div className="battle-actions">
            <ActionButton
              className="fight-action"
              icon={<Icon name="spark" />}
              onClick={() => setMenu("moves")}
            >
              招式
            </ActionButton>
            <ActionButton
              className={"catch-action" + (battle.catchReady ? " ready" : "")}
              icon={<Item name="poke-ball" />}
              disabled={battle.kind !== "wild"}
              onClick={() => setMenu("balls")}
            >
              {battle.kind !== "wild" ? "挑战中" : "捕捉"}
            </ActionButton>
            <ActionButton
              icon={
                <Sprite
                  id={otherPartner?.speciesId || active.speciesId}
                  decorative
                />
              }
              onClick={() => setMenu("team")}
            >
              换伙伴
            </ActionButton>
            <ActionButton
              icon={<Icon name="foot" />}
              disabled={battle.kind !== "wild"}
              onClick={() => choose({ type: "leave" })}
            >
              离开
            </ActionButton>
          </div>
        )}

        {battle.kind === "boss" && (
          <p className="battle-rule">
            {game.badges.includes(battle.area)
              ? "再次挑战守护者：一起练习配合，获胜后伙伴会获得经验。"
              : "守护者挑战：一起坚持到结束，获胜就能得到徽章。"}
          </p>
        )}
      </section>
    </main>
  );
}
