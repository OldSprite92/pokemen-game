import { useState } from 'react'
import { AREAS, SPECIES, effectiveness, type Element } from './data'
import { type GameState, type GameAction } from './engine'
import { ActionButton, Health, Icon, Item, Sprite, TypeTag, type IconName } from './components'

const MOVE_ICONS: Record<Element, IconName> = {
  electric: 'spark', fire: 'fire', water: 'water', grass: 'leaf', bug: 'leaf',
  rock: 'rock', flying: 'compass', poison: 'moon', normal: 'shield',
}

interface BattleScreenProps {
  game: GameState
  act: (action: GameAction) => void
  onBag: () => void
  onCompanion: () => void
  onContinue: () => void
}

export function BattleScreen({
  game,
  act,
  onBag,
  onCompanion,
  onContinue,
}: BattleScreenProps) {
  const [menu, setMenu] = useState<'main' | 'moves' | 'team'>('main')
  const battle = game.battle!
  const active = game.roster.find(creature => creature.id === battle.activeId)
    || game.roster.find(creature => creature.id === game.leaderId)!
  const enemy = battle.enemy
  const own = SPECIES[active.speciesId]
  const opponent = SPECIES[enemy.speciesId]
  const attackEvent = game.events.find(event => event.kind === 'attack' && event.actor === 'player')
  const attackSpecies = attackEvent?.speciesId ? SPECIES[attackEvent.speciesId] : undefined
  const attackMove = attackSpecies?.moves.find(move => attackEvent?.message.includes(move.name))
  const justAttacked = !!attackEvent
  const enemyAttacked = game.events.some(event => event.kind === 'damage' && event.actor === 'enemy')
  const catchFailed = game.events.some(event => event.kind === 'catch-fail')
  const messages = game.events.filter(event =>
    ['message', 'catch-fail', 'level-up', 'loss', 'win', 'damage', 'attack', 'heal'].includes(event.kind),
  )
  const message = messages[messages.length - 1]?.message
    || (battle.catchReady && battle.kind === 'wild'
      ? '好机会！试试精灵球吧。'
      : '轮到' + own.name + '了，准备好了吗？')

  function choose(action: GameAction) {
    setMenu('main')
    act(action)
  }

  const complete = battle.status !== 'active'
  if (complete) {
    const caught = battle.status === 'caught'
    const won = battle.status === 'won'
    const lost = battle.status === 'lost'
    const newBadge = won && !!battle.newBadge
    const joinedTeam = !!battle.caughtId && game.teamIds.includes(battle.caughtId)
    const resultTitle = caught
      ? '遇见新伙伴！'
      : lost
        ? '回营地歇一歇'
        : newBadge
          ? '获得冒险徽章！'
          : '太棒了，赢啦！'
    const resultMessage = caught
      ? joinedTeam
        ? '已经加入队伍，一起去看看吧。'
        : '正在营地等你，给它一个队伍位置吧。'
      : lost
        ? '伙伴和发现都在。恢复体力就能继续。'
        : game.events.find(event => event.kind === 'level-up')?.message
          || (battle.kind === 'boss' && !newBadge
            ? '再次赢得了守护者的认可，伙伴也获得了经验！'
            : '伙伴获得了经验，也变得更勇敢了。')

    return (
      <main className={'battle-screen result-screen' + (battle.area === 'cave' ? ' cave-battle' : '')}>
        <div className="battle-backdrop" />
        <div className="result-panel">
          <span className="eyebrow">
            {caught
              ? '又一段友谊，开始了'
              : lost
                ? '休息好了，再来一次'
                : newBadge
                  ? '你们是很棒的搭档'
                  : '配合得真不错'}
          </span>
          <h1>{resultTitle}</h1>
          <div className="result-pokemon">
            <span className="celebration-rays" aria-hidden="true" />
            <Sprite
              id={caught ? enemy.speciesId : active.speciesId}
              className={caught ? 'new-friend' : ''}
            />
            {caught && (
              <span className="capture-success-ball" aria-hidden="true">
                <Item name="poke-ball" />
              </span>
            )}
            {newBadge && (
              <div className={'reward-badge badge-' + battle.area}>
                <Icon name={battle.area === 'meadow' ? 'leaf' : battle.area === 'lake' ? 'water' : 'rock'} />
              </div>
            )}
          </div>
          <h2>{caught ? opponent.name : newBadge ? AREAS[battle.area].badgeName : own.name}</h2>
          <p role="status">{resultMessage}</p>
          <div className="result-actions">
            <ActionButton primary icon={<Icon name={lost ? 'home' : 'foot'} />} onClick={onContinue}>
              {lost ? '回到营地' : '继续冒险'}
            </ActionButton>
            {!lost && (
              <ActionButton icon={<Icon name="heart" />} onClick={onCompanion}>
                {caught ? '看看新伙伴' : '看看伙伴'}
              </ActionButton>
            )}
          </div>
          {game.badges.length === 3 && won && (
            <p className="island-complete">
              <Icon name="flag" />
              三枚徽章集齐了！小岛探险家，继续发现更多伙伴吧。
            </p>
          )}
        </div>
      </main>
    )
  }

  const otherPartner = game.roster.find(creature =>
    creature.id === game.teamIds.find(id => id !== active.id),
  )

  return (
    <main
      className={'battle-screen' + (battle.area === 'cave' ? ' cave-battle' : '')}
      aria-label={own.name + '与' + opponent.name + '对战'}
    >
      <div className="battle-backdrop" />
      <div className="battle-stage">
        <div className="battle-context">
          <span className="area-dot" />
          {battle.kind === 'boss' ? AREAS[battle.area].bossName : '野生宝可梦出现了'}
          <span>第 {battle.turn + 1} 回合</span>
        </div>

        <div className="battle-status enemy-status">
          <div><strong>{opponent.name}</strong><span>Lv. {enemy.level}</span></div>
          <Health creature={enemy} />
          <TypeTag type={opponent.type} />
        </div>

        <div className="enemy-position">
          <div
            key={'enemy-' + game.revision}
            className={'battle-sprite-wrap' + (enemyAttacked ? ' enemy-attack' : '')}
          >
            <Sprite id={enemy.speciesId} className={'enemy-sprite' + (justAttacked ? ' take-hit' : '')} />
          </div>
          {attackMove && attackSpecies && (
            <>
              <div key={'effect-' + game.revision} className="move-effect" data-element={attackMove.type} aria-hidden="true">
                <span><Icon name={MOVE_ICONS[attackMove.type]} /></span>
                <span><Icon name={MOVE_ICONS[attackMove.type]} /></span>
                <span><Icon name={MOVE_ICONS[attackMove.type]} /></span>
              </div>
              <span key={'callout-' + game.revision} className="move-callout" role="status">
                <small>{attackSpecies.name}</small><strong>{attackMove.name}</strong>
              </span>
            </>
          )}
          {battle.catchReady && battle.kind === 'wild' && (
            <span className="catch-cue"><Item name="poke-ball" />好机会</span>
          )}
          {catchFailed && (
            <span key={game.revision} className="throw-ball" aria-hidden="true">
              <Item name="poke-ball" />
            </span>
          )}
        </div>

        <div className="player-position">
          <div
            key={'player-' + game.revision}
            className={'battle-sprite-wrap' + (justAttacked ? ' player-attack' : '')}
          >
            <Sprite
              id={active.speciesId}
              back
              className={'player-sprite' + (enemyAttacked ? ' player-hit' : '')}
            />
          </div>
        </div>

        <div className="battle-status player-status">
          <div><strong>{own.name}</strong><span>Lv. {active.level}</span></div>
          <Health creature={active} />
          <div className="battle-team-dots" aria-label="出战队伍">
            {game.teamIds.map(id => {
              const creature = game.roster.find(partner => partner.id === id)!
              const state = creature.hp <= 0 ? '需要休息' : id === active.id ? '正在出战' : '准备好了'
              return (
                <span
                  key={id}
                  className={creature.hp <= 0 ? 'tired' : id === active.id ? 'active' : ''}
                  role="img"
                  aria-label={SPECIES[creature.speciesId].name + '，' + state}
                >
                  <Item name="poke-ball" />
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <section className="battle-console" aria-label="战斗操作">
        <div className="battle-message">
          <Sprite id={active.speciesId} decorative />
          <p role="status">{message}</p>
          <button type="button" className="console-bag" onClick={onBag} aria-label="打开背包使用树果">
            <Item name="explorer-kit" />
          </button>
        </div>

        {menu === 'moves' ? (
          <div className="move-options">
            {own.moves.map((move, index) => {
              const multiplier = effectiveness(move.type, opponent.type)
              return (
                <button
                  type="button"
                  key={move.id}
                  className={'move-button move-' + move.type}
                  onClick={() => choose({ type: 'attack', moveIndex: index as 0 | 1 })}
                >
                  <TypeTag type={move.type} />
                  <strong>{move.name}</strong>
                  <small>{multiplier > 1 ? '效果更好！' : multiplier < 1 ? '效果较弱' : '准备出招'}</small>
                </button>
              )
            })}
            <button type="button" className="back-action" onClick={() => setMenu('main')}>
              <Icon name="close" />返回
            </button>
          </div>
        ) : menu === 'team' ? (
          <div className="switch-options">
            {game.teamIds.map(id => {
              const creature = game.roster.find(partner => partner.id === id)!
              return (
                <button
                  type="button"
                  className="switch-choice"
                  key={id}
                  disabled={id === active.id || creature.hp <= 0}
                  onClick={() => choose({ type: 'switch', creatureId: id })}
                >
                  <Sprite id={creature.speciesId} decorative />
                  <strong>{SPECIES[creature.speciesId].name}</strong>
                  <small>{id === active.id ? '正在出战' : creature.hp <= 0 ? '需要休息' : '换它上场'}</small>
                </button>
              )
            })}
            <button type="button" className="back-action" onClick={() => setMenu('main')}>
              <Icon name="close" />返回
            </button>
          </div>
        ) : (
          <div className="battle-actions">
            <ActionButton className="fight-action" icon={<Icon name="spark" />} onClick={() => setMenu('moves')}>
              招式
            </ActionButton>
            <ActionButton
              className={'catch-action' + (battle.catchReady ? ' ready' : '')}
              icon={<Item name="poke-ball" />}
              disabled={battle.kind === 'boss'}
              onClick={() => choose({ type: 'catch' })}
            >
              {battle.kind === 'boss' ? '挑战中' : '捕捉'}
            </ActionButton>
            <ActionButton
              icon={<Sprite id={otherPartner?.speciesId || active.speciesId} decorative />}
              onClick={() => setMenu('team')}
            >
              换伙伴
            </ActionButton>
            <ActionButton
              icon={<Icon name="foot" />}
              disabled={battle.kind === 'boss'}
              onClick={() => choose({ type: 'leave' })}
            >
              离开
            </ActionButton>
          </div>
        )}

        {battle.kind === 'boss' && (
          <p className="battle-rule">
            {game.badges.includes(battle.area)
              ? '再次挑战守护者：一起练习配合，获胜后伙伴会获得经验。'
              : '守护者挑战：一起坚持到结束，获胜就能得到徽章。'}
          </p>
        )}
      </section>
    </main>
  )
}
