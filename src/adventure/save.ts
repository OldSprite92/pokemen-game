import { AREAS, SPECIES, type AreaId } from './data'
import { availableSpecies, canTravel, maxHp, xpToNext, type Battle, type Creature, type GameEvent, type GameState } from './engine'

export const SAVE_KEY = 'pokemon-adventure-visual-v2'
export const BACKUP_KEY = `${SAVE_KEY}-backup`
export const CORRUPT_KEY = `${SAVE_KEY}-unreadable`
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LoadResult { state: GameState | null; status: 'empty' | 'loaded' | 'recovered' | 'corrupt' | 'unavailable'; message: string }
export interface SaveResult { ok: boolean; message: string }

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function integer(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max }
function unique<T>(values: T[]): boolean { return new Set(values).size === values.length }
function creature(value: unknown, enemy = false): Creature | null {
  if (!record(value) || typeof value.id !== 'string' || !(enemy ? /^wild-[1-9]\d{0,8}$/ : /^partner-[1-9]\d{0,8}$/).test(value.id)) return null
  if (!integer(value.speciesId, 1, 1000) || !SPECIES[value.speciesId] || !integer(value.level, 1, 30) || !integer(value.xp, 0, xpToNext(value.level) - 1) || !integer(value.hp, 0, 1000)) return null
  const result: Creature = { id: value.id, speciesId: value.speciesId, level: value.level, xp: value.xp, hp: value.hp }
  return result.hp <= maxHp(result) ? result : null
}
const EVENT_KINDS = new Set(['encounter', 'attack', 'damage', 'catch-success', 'catch-fail', 'level-up', 'win', 'loss', 'switch', 'heal', 'evolve', 'message'])
function event(value: unknown): GameEvent | null {
  if (!record(value) || typeof value.kind !== 'string' || !EVENT_KINDS.has(value.kind) || typeof value.message !== 'string' || value.message.length > 300) return null
  if (value.speciesId !== undefined && (!integer(value.speciesId, 1, 1000) || !SPECIES[value.speciesId])) return null
  if (value.creatureId !== undefined && (typeof value.creatureId !== 'string' || value.creatureId.length > 30)) return null
  if (value.damage !== undefined && !integer(value.damage, 0, 10000)) return null
  if (value.actor !== undefined && !['player', 'enemy', 'system'].includes(value.actor as string)) return null
  return { kind: value.kind as GameEvent['kind'], message: value.message, ...(value.speciesId !== undefined && { speciesId: value.speciesId as number }), ...(value.creatureId !== undefined && { creatureId: value.creatureId as string }), ...(value.damage !== undefined && { damage: value.damage as number }), ...(value.actor !== undefined && { actor: value.actor as GameEvent['actor'] }) }
}

/** Rebuild only known fields; never trust local JSON as live game state. */
export function validateGame(value: unknown): GameState | null {
  if (!record(value) || value.version !== 2 || !Array.isArray(value.roster) || value.roster.length < 1 || value.roster.length > 1000) return null
  const roster = value.roster.map(item => creature(item))
  if (roster.some(item => !item)) return null
  const safeRoster = roster as Creature[]
  if (!unique(safeRoster.map(item => item.id))) return null
  if (!Array.isArray(value.teamIds) || value.teamIds.length < 1 || value.teamIds.length > 3 || !value.teamIds.every(id => typeof id === 'string' && safeRoster.some(item => item.id === id)) || !unique(value.teamIds)) return null
  if (typeof value.leaderId !== 'string' || !value.teamIds.includes(value.leaderId)) return null
  if (typeof value.area !== 'string' || !Object.hasOwn(AREAS, value.area)) return null
  if (!Array.isArray(value.seen) || value.seen.length > Object.keys(SPECIES).length || !value.seen.every(id => integer(id, 1, 1000) && !!SPECIES[id]) || !unique(value.seen)) return null
  const seen = value.seen as number[]
  if (safeRoster.some(item => !seen.includes(item.speciesId))) return null
  // Older v2 snapshots did not preserve past forms. Keep every current form
  // when reading them, then record future catches and evolutions permanently.
  const caughtSpeciesIds = value.caughtSpeciesIds === undefined ? [...new Set(safeRoster.map(item => item.speciesId))] : value.caughtSpeciesIds
  if (!Array.isArray(caughtSpeciesIds) || caughtSpeciesIds.length > Object.keys(SPECIES).length || !caughtSpeciesIds.every(id => integer(id, 1, 1000) && !!SPECIES[id] && seen.includes(id)) || !unique(caughtSpeciesIds)) return null
  if (safeRoster.some(item => !caughtSpeciesIds.includes(item.speciesId))) return null
  if (!Array.isArray(value.badges) || !value.badges.every(area => ['meadow', 'lake', 'cave'].includes(area)) || !unique(value.badges)) return null
  if (value.badges.includes('cave') && !value.badges.includes('lake')) return null
  if (!integer(value.berries, 0, 9) || typeof value.tutorialCaptured !== 'boolean' || !integer(value.encounters, 0, 99999999) || !integer(value.revision, 0, Number.MAX_SAFE_INTEGER) || !integer(value.nextCreatureId, 2, 99999999)) return null
  if (value.nextCreatureId <= Math.max(...safeRoster.map(item => Number(item.id.split('-')[1])))) return null
  if (!record(value.settings) || typeof value.settings.reducedMotion !== 'boolean') return null
  if (!Array.isArray(value.events) || value.events.length > 100) return null
  const events = value.events.map(event)
  if (events.some(item => !item)) return null
  const state: GameState = { version: 2, roster: safeRoster, teamIds: value.teamIds as string[], leaderId: value.leaderId, area: value.area as AreaId, seen: value.seen as number[], caughtSpeciesIds: caughtSpeciesIds as number[], badges: value.badges as string[], berries: value.berries, tutorialCaptured: value.tutorialCaptured, encounters: value.encounters, settings: { reducedMotion: value.settings.reducedMotion }, battle: null, events: events as GameEvent[], revision: value.revision, nextCreatureId: value.nextCreatureId }
  if (!canTravel(state, state.area)) return null
  if (value.battle !== null) {
    const raw = value.battle
    if (!record(raw) || typeof raw.id !== 'string' || !/^encounter-[1-9]\d{0,8}$/.test(raw.id) || !['wild', 'boss'].includes(raw.kind as string) || !['meadow', 'lake', 'cave'].includes(raw.area as string)) return null
    const enemy = creature(raw.enemy, true)
    if (!enemy || typeof raw.activeId !== 'string' || !state.roster.some(item => item.id === raw.activeId) || !integer(raw.turn, 0, 100000) || typeof raw.catchReady !== 'boolean' || !integer(raw.failedReadyCatches, 0, 1)) return null
    if (!['active', 'won', 'caught', 'lost'].includes(raw.status as string) || typeof raw.rewardClaimed !== 'boolean') return null
    if (raw.newBadge !== undefined && typeof raw.newBadge !== 'boolean') return null
    if (raw.newBadge === true && (raw.kind !== 'boss' || raw.status !== 'won' || !state.badges.includes(raw.area as string))) return null
    const area = AREAS[raw.area as AreaId]
    if (raw.kind === 'boss' ? area.bossSpeciesId !== enemy.speciesId : !availableSpecies(state, raw.area as AreaId).includes(enemy.speciesId)) return null
    if (raw.id !== `encounter-${state.encounters}` || enemy.id !== `wild-${state.encounters}` || !state.seen.includes(enemy.speciesId) || enemy.xp !== 0 || enemy.level !== area.level + (raw.kind === 'boss' ? 1 : 0)) return null
    if (!raw.catchReady && raw.failedReadyCatches !== 0) return null
    if (raw.status === 'active') {
      if (raw.rewardClaimed || enemy.hp <= 0 || state.area !== raw.area || !state.teamIds.includes(raw.activeId) || !state.roster.some(item => item.id === raw.activeId && item.hp > 0)) return null
    } else if (!raw.rewardClaimed) return null
    if (raw.status === 'won' && enemy.hp !== 0) return null
    if (raw.status === 'lost' && state.area !== 'camp') return null
    if (raw.status === 'caught' && (raw.kind !== 'wild' || typeof raw.caughtId !== 'string' || !state.roster.some(item => item.id === raw.caughtId))) return null
    if (raw.caughtId !== undefined && (typeof raw.caughtId !== 'string' || !state.roster.some(item => item.id === raw.caughtId))) return null
    state.battle = { id: raw.id, kind: raw.kind as Battle['kind'], area: raw.area as AreaId, enemy, activeId: raw.activeId, turn: raw.turn, catchReady: raw.catchReady, failedReadyCatches: raw.failedReadyCatches, status: raw.status as Battle['status'], rewardClaimed: raw.rewardClaimed, newBadge: raw.newBadge === true, ...(raw.caughtId !== undefined && { caughtId: raw.caughtId as string }) }
  }
  return state
}

function browserStorage(storage?: StorageLike): StorageLike { return storage ?? window.localStorage }
function parse(raw: string | null): GameState | null {
  if (!raw || raw.length > 2_000_000) return null
  try { return validateGame(JSON.parse(raw)) } catch { return null }
}
export function loadGame(storage?: StorageLike): LoadResult {
  try {
    const store = browserStorage(storage)
    const raw = store.getItem(SAVE_KEY)
    const current = parse(raw)
    if (current) return { state: current, status: 'loaded', message: '冒险进度已恢复。' }
    const backupRaw = store.getItem(BACKUP_KEY)
    const backup = parse(backupRaw)
    if (backup) {
      let restored = true
      try {
        if (raw) store.setItem(CORRUPT_KEY, raw.slice(0, 2_000_000))
        const encoded = JSON.stringify(backup)
        store.setItem(SAVE_KEY, encoded)
        restored = store.getItem(SAVE_KEY) === encoded
      } catch { restored = false }
      return { state: backup, status: restored ? 'recovered' : 'unavailable', message: restored ? '已从上一次安全记录恢复冒险。' : '已从上一次安全记录恢复冒险，但设备暂时无法保存新进度。' }
    }
    if (raw !== null || backupRaw !== null) {
      try { store.setItem(CORRUPT_KEY, (raw ?? backupRaw ?? '').slice(0, 2_000_000)) } catch { /* Keep the original in place when preservation fails. */ }
      return { state: null, status: 'corrupt', message: '这份冒险记录暂时无法读取。原记录已保留，可以重新开始。' }
    }
    return { state: null, status: 'empty', message: '' }
  } catch { return { state: null, status: 'unavailable', message: '设备暂时无法读取存档。本次可以游玩，但请留意保存提示。' } }
}
export function saveGame(state: GameState, storage?: StorageLike): SaveResult {
  const safeState = validateGame(state)
  if (!safeState) return { ok: false, message: '进度未保存，请先保留当前画面。' }
  try {
    const store = browserStorage(storage)
    const previous = store.getItem(SAVE_KEY)
    if (parse(previous)) {
      try { store.setItem(BACKUP_KEY, previous!) } catch { /* A full disk may still allow replacing the existing primary entry. */ }
    }
    const encoded = JSON.stringify(safeState)
    store.setItem(SAVE_KEY, encoded)
    if (store.getItem(SAVE_KEY) !== encoded) return { ok: false, message: '设备没有保存这次进度，请保持游戏打开并重试。' }
    return { ok: true, message: '已自动保存' }
  } catch { return { ok: false, message: '进度暂未保存。请检查设备存储空间，再重试。' } }
}
