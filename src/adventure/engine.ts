import { AREAS, SPECIES, STARTERS, effectiveness, type AreaId, type Element } from './data'
export type { AreaId, Species, Element } from './data'
export type PokemonType = Element

export interface Creature { id: string; speciesId: number; level: number; xp: number; hp: number }
export interface Battle {
  id: string
  kind: 'wild' | 'boss'
  area: AreaId
  enemy: Creature
  activeId: string
  turn: number
  catchReady: boolean
  failedReadyCatches: number
  status: 'active' | 'won' | 'caught' | 'lost'
  rewardClaimed: boolean
  caughtId?: string
  newBadge?: boolean
}
export type EventKind = 'encounter' | 'attack' | 'damage' | 'catch-success' | 'catch-fail' | 'level-up' | 'win' | 'loss' | 'switch' | 'heal' | 'evolve' | 'message'
export interface GameEvent {
  kind: EventKind
  message: string
  speciesId?: number
  creatureId?: string
  damage?: number
  actor?: 'player' | 'enemy' | 'system'
}
export interface GameState {
  version: 2
  roster: Creature[]
  teamIds: string[]
  leaderId: string
  area: AreaId
  seen: number[]
  caughtSpeciesIds: number[]
  badges: string[]
  berries: number
  tutorialCaptured: boolean
  encounters: number
  settings: { reducedMotion: boolean }
  battle: Battle | null
  events: GameEvent[]
  revision: number
  nextCreatureId: number
}
export type GameAction =
  | { type: 'travel'; area: AreaId }
  | { type: 'encounter'; speciesId?: number; boss?: boolean }
  | { type: 'attack'; moveIndex: 0 | 1 }
  | { type: 'catch' }
  | { type: 'switch'; creatureId: string }
  | { type: 'leave' }
  | { type: 'finishBattle' }
  | { type: 'heal' }
  | { type: 'berry'; creatureId: string }
  | { type: 'setLeader'; creatureId: string }
  | { type: 'toggleTeam'; creatureId: string }
  | { type: 'evolve'; creatureId: string }
  | { type: 'settings'; reducedMotion: boolean }

export function maxHp(creature: Creature): number { return SPECIES[creature.speciesId].baseHp + creature.level * 6 }
export function xpToNext(level: number): number { return level * 10 }
export function getLeader(state: GameState): Creature { return state.roster.find(c => c.id === state.leaderId) ?? state.roster[0] }
export function canEvolve(creature: Creature): boolean { const evolution = SPECIES[creature.speciesId].evolution; return !!evolution && creature.level >= evolution.level }
export function canTravel(state: GameState, area: AreaId): boolean {
  if (!AREAS[area]) return false
  if (area === 'camp' || area === 'meadow') return true
  if (area === 'lake') return state.tutorialCaptured
  return state.badges.includes('lake')
}
export function availableSpecies(state: GameState, area: AreaId = state.area): number[] {
  const region = AREAS[area]
  if (!region) return []
  const pool = [...region.speciesIds]
  if (region.bossSpeciesId && state.badges.includes(area) && !pool.includes(region.bossSpeciesId)) pool.push(region.bossSpeciesId)
  return pool
}
export function isAdventureComplete(state: GameState): boolean { return ['meadow', 'lake', 'cave'].every(area => state.badges.includes(area)) }

export function createGame(starterId: number): GameState {
  const speciesId = STARTERS.includes(starterId as typeof STARTERS[number]) ? starterId : STARTERS[0]
  const starter: Creature = { id: 'partner-1', speciesId, level: 3, xp: 0, hp: 1 }
  starter.hp = maxHp(starter)
  return { version: 2, roster: [starter], teamIds: [starter.id], leaderId: starter.id, area: 'meadow', seen: [speciesId], caughtSpeciesIds: [speciesId], badges: [], berries: 3, tutorialCaptured: false, encounters: 0, settings: { reducedMotion: false }, battle: null, events: [{ kind: 'message', message: '点一点草丛里的宝可梦，一起开始冒险！', speciesId }], revision: 0, nextCreatureId: 2 }
}

function cloneState(state: GameState): GameState {
  return { ...state, roster: state.roster.map(creature => ({ ...creature })), teamIds: [...state.teamIds], seen: [...state.seen], caughtSpeciesIds: [...state.caughtSpeciesIds], badges: [...state.badges], settings: { ...state.settings }, battle: state.battle ? { ...state.battle, enemy: { ...state.battle.enemy } } : null, events: [], revision: state.revision + 1 }
}
function message(state: GameState, text: string): void { state.events.push({ kind: 'message', message: text, actor: 'system' }) }
function randomValue(rng: () => number): number { const value = rng(); return Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0.5 }
function see(state: GameState, speciesId: number): void { if (!state.seen.includes(speciesId)) state.seen.push(speciesId) }
function rememberCaught(state: GameState, speciesId: number): void { if (!state.caughtSpeciesIds.includes(speciesId)) state.caughtSpeciesIds.push(speciesId) }
function healEveryone(state: GameState): void { state.roster.forEach(c => { c.hp = maxHp(c) }); state.berries = 3 }
function addExperience(state: GameState, activeId: string, amount: number): void {
  for (const id of state.teamIds) {
    const creature = state.roster.find(c => c.id === id)!
    creature.xp += id === activeId ? amount : Math.max(5, Math.floor(amount / 2))
    while (creature.level < 30 && creature.xp >= xpToNext(creature.level)) {
      const oldMax = maxHp(creature)
      creature.xp -= xpToNext(creature.level)
      creature.level += 1
      creature.hp = Math.min(maxHp(creature), creature.hp + maxHp(creature) - oldMax)
      state.events.push({ kind: 'level-up', message: `${SPECIES[creature.speciesId].name}升到 ${creature.level} 级了！`, speciesId: creature.speciesId, creatureId: creature.id, actor: 'player' })
    }
    if (creature.level === 30) creature.xp = Math.min(creature.xp, xpToNext(30) - 1)
  }
}
function finishWin(state: GameState): void {
  const battle = state.battle!
  if (battle.rewardClaimed) return
  battle.status = 'won'
  battle.rewardClaimed = true
  battle.newBadge = false
  const area = AREAS[battle.area]
  if (battle.kind === 'boss' && !state.badges.includes(battle.area)) {
    state.badges.push(battle.area)
    battle.newBadge = true
    state.events.push({ kind: 'win', message: `获得${area.badgeName}！伙伴们做到了！`, speciesId: battle.enemy.speciesId, actor: 'system' })
  } else state.events.push({ kind: 'win', message: '配合得真好！冒险经验增加了。', speciesId: battle.enemy.speciesId, actor: 'system' })
  addExperience(state, battle.activeId, battle.kind === 'boss' ? 25 : 10)
  state.berries = Math.min(9, state.berries + 1)
}
function enemyTurn(state: GameState, rng: () => number): void {
  const battle = state.battle!
  if (battle.status !== 'active') return
  const active = state.roster.find(c => c.id === battle.activeId)!
  const enemySpecies = SPECIES[battle.enemy.speciesId]
  const enemyMove = enemySpecies.moves[randomValue(rng) < 0.5 ? 0 : 1]
  const multiplier = effectiveness(enemyMove.type, SPECIES[active.speciesId].type)
  const damage = Math.max(3, Math.round((3 + battle.enemy.level + enemySpecies.attack * 0.25) * multiplier))
  active.hp = Math.max(0, active.hp - damage)
  state.events.push({ kind: 'damage', message: `${enemySpecies.name}使出了${enemyMove.name}`, speciesId: battle.enemy.speciesId, creatureId: active.id, damage, actor: 'enemy' })
  if (active.hp > 0) return
  const next = state.roster.find(c => state.teamIds.includes(c.id) && c.hp > 0)
  if (next) {
    battle.activeId = next.id
    state.events.push({ kind: 'switch', message: `${SPECIES[active.speciesId].name}休息一下，${SPECIES[next.speciesId].name}来帮忙！`, speciesId: next.speciesId, creatureId: next.id, actor: 'player' })
  } else {
    battle.status = 'lost'
    battle.rewardClaimed = true
    state.area = 'camp'
    healEveryone(state)
    state.events.push({ kind: 'loss', message: '伙伴们有点累了。已经回营地恢复，随时可以再出发！', actor: 'system' })
  }
}

/** All turn outcomes are committed together; events describe their playback order. */
export function reduceGame(original: GameState, action: GameAction, rng: () => number = Math.random): GameState {
  const state = cloneState(original)
  const battle = state.battle
  const activeBattle = battle?.status === 'active'
  switch (action.type) {
    case 'settings': state.settings.reducedMotion = !!action.reducedMotion; break
    case 'travel': {
      if (activeBattle) { message(state, '先完成眼前的对战吧。'); break }
      if (!canTravel(state, action.area)) { message(state, action.area === 'lake' ? '结识第一位新伙伴，就能去湖畔啦。' : '取得水滴徽章，就能探索洞窟啦。'); break }
      state.battle = null
      state.area = action.area
      if (action.area === 'camp') { healEveryone(state); state.events.push({ kind: 'heal', message: '伙伴体力已恢复，树果也补好了。', actor: 'system' }) }
      else message(state, `来到${AREAS[action.area].name}。点一点想认识的宝可梦吧！`)
      break
    }
    case 'encounter': {
      if (battle) { message(state, '先结束这次相遇吧。'); break }
      if (state.area === 'camp') { message(state, '先选一处地方去冒险吧。'); break }
      const area = AREAS[state.area]
      const pool = availableSpecies(state)
      const speciesId = action.boss ? area.bossSpeciesId : action.speciesId ?? pool[Math.floor(randomValue(rng) * pool.length)]
      if (!speciesId || !SPECIES[speciesId] || (!action.boss && !pool.includes(speciesId))) { message(state, '这位伙伴不在这里，去附近找找吧。'); break }
      const leader = getLeader(state)
      const active = leader.hp > 0 ? leader : state.roster.find(c => state.teamIds.includes(c.id) && c.hp > 0)
      if (!active) { state.area = 'camp'; healEveryone(state); message(state, '先回营地恢复体力，再出发吧。'); break }
      state.encounters += 1
      const enemy: Creature = { id: `wild-${state.encounters}`, speciesId, level: area.level + (action.boss ? 1 : 0), xp: 0, hp: 1 }
      enemy.hp = maxHp(enemy)
      state.battle = { id: `encounter-${state.encounters}`, kind: action.boss ? 'boss' : 'wild', area: state.area, enemy, activeId: active.id, turn: 0, catchReady: false, failedReadyCatches: 0, status: 'active', rewardClaimed: false, newBadge: false }
      see(state, speciesId)
      state.events.push({ kind: 'encounter', message: action.boss ? `${area.bossName}接受挑战！胜利后获得徽章。` : `遇见${SPECIES[speciesId].name}了！`, speciesId, actor: 'enemy' })
      break
    }
    case 'attack': {
      if (!activeBattle || !battle || (action.moveIndex !== 0 && action.moveIndex !== 1)) return original
      const active = state.roster.find(c => c.id === battle.activeId)!
      const species = SPECIES[active.speciesId]
      const selectedMove = species.moves[action.moveIndex]
      const multiplier = effectiveness(selectedMove.type, SPECIES[battle.enemy.speciesId].type)
      const damage = Math.max(1, Math.round((selectedMove.power + species.attack * 0.35 + active.level) * multiplier))
      battle.enemy.hp = Math.max(0, battle.enemy.hp - damage)
      battle.catchReady = true
      battle.turn += 1
      state.events.push({ kind: 'attack', message: `${species.name}使出了${selectedMove.name}${multiplier > 1 ? '，效果很好！' : '！'}`, speciesId: active.speciesId, creatureId: active.id, damage, actor: 'player' })
      if (battle.enemy.hp === 0) finishWin(state)
      else enemyTurn(state, rng)
      break
    }
    case 'catch': {
      if (!activeBattle || !battle) return original
      if (battle.kind === 'boss') { message(state, '这是守护者挑战，取得徽章就能得到它的认可。'); break }
      if (state.roster.length >= 1000) { message(state, '营地已经住满伙伴啦，带着大家继续挑战吧。'); break }
      const chance = battle.catchReady ? 0.9 : 0.2
      const success = !state.tutorialCaptured || (battle.catchReady && battle.failedReadyCatches > 0) || randomValue(rng) < chance
      battle.turn += 1
      if (success) {
        const caught: Creature = { ...battle.enemy, id: `partner-${state.nextCreatureId++}`, xp: 0 }
        caught.hp = maxHp(caught)
        state.roster.push(caught)
        rememberCaught(state, caught.speciesId)
        const joinedTeam = state.teamIds.length < 3
        if (joinedTeam) state.teamIds.push(caught.id)
        state.tutorialCaptured = true
        battle.status = 'caught'
        battle.rewardClaimed = true
        battle.caughtId = caught.id
        state.events.push({ kind: 'catch-success', message: `${SPECIES[caught.speciesId].name}成为新伙伴！${joinedTeam ? '已经加入队伍。' : '正在营地等你。'}`, speciesId: caught.speciesId, creatureId: caught.id, actor: 'player' })
        addExperience(state, battle.activeId, 10)
      } else {
        if (battle.catchReady) battle.failedReadyCatches += 1
        state.events.push({ kind: 'catch-fail', message: battle.catchReady ? '差一点点！再试一次就能接住它。' : '它还很有精神。先用招式创造机会吧！', speciesId: battle.enemy.speciesId, actor: 'enemy' })
        enemyTurn(state, rng)
      }
      break
    }
    case 'switch': {
      if (!activeBattle || !battle) return original
      const next = state.roster.find(c => c.id === action.creatureId)
      if (!next || !state.teamIds.includes(next.id) || next.hp <= 0 || battle.activeId === next.id) return original
      battle.activeId = next.id
      battle.turn += 1
      state.events.push({ kind: 'switch', message: `上吧，${SPECIES[next.speciesId].name}！`, speciesId: next.speciesId, creatureId: next.id, actor: 'player' })
      enemyTurn(state, rng)
      break
    }
    case 'leave': {
      if (!battle) return original
      if (activeBattle && battle.kind === 'boss') { message(state, '守护者挑战已经开始，加油！伙伴们会互相帮助。'); break }
      state.battle = null
      message(state, '继续看看附近有什么吧。')
      break
    }
    case 'finishBattle': if (battle && !activeBattle) { state.battle = null; message(state, state.area === 'camp' ? '伙伴们休息好了，一起再出发吧。' : '下一位伙伴，会在哪里呢？') } else return original; break
    case 'heal': {
      if (activeBattle) { message(state, '现在可以用树果恢复体力。'); break }
      if (state.area !== 'camp') { message(state, '回营地就能让所有伙伴恢复体力。'); break }
      healEveryone(state)
      state.events.push({ kind: 'heal', message: '大家恢复精神了！树果补到 3 颗。', actor: 'system' })
      break
    }
    case 'berry': {
      const target = state.roster.find(c => c.id === action.creatureId)
      if (!target || (activeBattle && !state.teamIds.includes(target.id))) return original
      if (state.berries <= 0) { message(state, '树果用完了，回营地可以补充。'); break }
      if (target.hp >= maxHp(target)) { message(state, `${SPECIES[target.speciesId].name}现在精神满满！`); break }
      state.berries -= 1
      target.hp = Math.min(maxHp(target), target.hp + Math.ceil(maxHp(target) * 0.45))
      state.events.push({ kind: 'heal', message: `${SPECIES[target.speciesId].name}吃下树果，恢复了体力。`, speciesId: target.speciesId, creatureId: target.id, actor: 'player' })
      if (activeBattle && battle) { battle.turn += 1; enemyTurn(state, rng) }
      break
    }
    case 'setLeader': {
      if (activeBattle) return original
      const target = state.roster.find(c => c.id === action.creatureId)
      if (!target) return original
      if (!state.teamIds.includes(target.id)) { message(state, '先让它加入队伍，再一起走吧。'); break }
      state.leaderId = target.id
      state.events.push({ kind: 'switch', message: `${SPECIES[target.speciesId].name}会跟着你一起走！`, speciesId: target.speciesId, creatureId: target.id, actor: 'player' })
      break
    }
    case 'toggleTeam': {
      if (activeBattle) return original
      const target = state.roster.find(c => c.id === action.creatureId)
      if (!target) return original
      if (state.teamIds.includes(target.id)) {
        if (state.teamIds.length === 1) { message(state, '至少带上一位伙伴，一起冒险吧。'); break }
        state.teamIds = state.teamIds.filter(id => id !== target.id)
        if (state.leaderId === target.id) state.leaderId = state.teamIds[0]
        message(state, `${SPECIES[target.speciesId].name}会在营地等你。`)
      } else {
        if (state.teamIds.length >= 3) { message(state, '队伍有 3 位伙伴啦。先让一位回营地休息吧。'); break }
        state.teamIds.push(target.id)
        message(state, `${SPECIES[target.speciesId].name}加入队伍了！`)
      }
      break
    }
    case 'evolve': {
      if (activeBattle) return original
      const target = state.roster.find(c => c.id === action.creatureId)
      if (!target || !canEvolve(target)) return original
      const oldName = SPECIES[target.speciesId].name
      rememberCaught(state, target.speciesId)
      target.speciesId = SPECIES[target.speciesId].evolution!.id
      target.hp = maxHp(target)
      see(state, target.speciesId)
      rememberCaught(state, target.speciesId)
      state.events.push({ kind: 'evolve', message: `${oldName}进化成了${SPECIES[target.speciesId].name}！`, speciesId: target.speciesId, creatureId: target.id, actor: 'player' })
      break
    }
    default: return original
  }
  return state
}
