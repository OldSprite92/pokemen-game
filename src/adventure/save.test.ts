import { describe, expect, it } from 'vitest'
import { createGame, reduceGame } from './engine'
import { BACKUP_KEY, CORRUPT_KEY, SAVE_KEY, loadGame, saveGame, validateGame, type StorageLike } from './save'

function memory(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }
}

describe('visual adventure save safety', () => {
  it('round-trips an active battle and resolves it exactly once after reload', () => {
    const storage = memory()
    const battle = reduceGame(createGame(25), { type: 'encounter', speciesId: 10 })
    expect(saveGame(battle, storage).ok).toBe(true)
    const loaded = loadGame(storage)
    expect(loaded.status).toBe('loaded')
    expect(loaded.state).toEqual(battle)
    const caught = reduceGame(loaded.state!, { type: 'catch' }, () => 0.99)
    expect(saveGame(caught, storage).ok).toBe(true)
    const reloaded = loadGame(storage).state!
    expect(reduceGame(reloaded, { type: 'catch' }).roster).toHaveLength(2)
    expect(reloaded.roster[0].xp).toBe(10)
  })
  it('preserves the last valid snapshot and recovers it from malformed primary JSON', () => {
    const storage = memory()
    const original = createGame(7)
    saveGame(original, storage)
    saveGame(reduceGame(original, { type: 'encounter', speciesId: 10 }), storage)
    storage.values.set(SAVE_KEY, '{broken')
    const recovered = loadGame(storage)
    expect(recovered.status).toBe('recovered')
    expect(recovered.state).toEqual(original)
    expect(storage.values.get(CORRUPT_KEY)).toBe('{broken')
    expect(loadGame(storage).status).toBe('loaded')
  })
  it('keeps a recovered game playable while truthfully reporting that storage is unavailable', () => {
    const backup = createGame(25)
    const values = new Map([[SAVE_KEY, '{broken'], [BACKUP_KEY, JSON.stringify(backup)]])
    const blocked: StorageLike = { getItem: key => values.get(key) ?? null, setItem: () => { throw new Error('quota') } }
    const recovered = loadGame(blocked)
    expect(recovered.status).toBe('unavailable')
    expect(recovered.state).toEqual(backup)
    expect(recovered.message).toContain('已从上一次安全记录恢复冒险')
    expect(recovered.message).toContain('无法保存')
    const continued = reduceGame(recovered.state!, { type: 'encounter', speciesId: 10 })
    expect(continued.battle?.status).toBe('active')
    expect(saveGame(continued, blocked).ok).toBe(false)
    expect(values.get(SAVE_KEY)).toBe('{broken')
  })
  it('also detects a silently dropped recovery write', () => {
    const backup = createGame(7)
    const values = new Map([[SAVE_KEY, '{broken'], [BACKUP_KEY, JSON.stringify(backup)]])
    const silent: StorageLike = { getItem: key => values.get(key) ?? null, setItem: () => undefined }
    expect(loadGame(silent)).toMatchObject({ state: backup, status: 'unavailable' })
  })
  it('migrates early v2 snapshots without captured-history or badge-result fields', () => {
    const storage = memory()
    const current = reduceGame(createGame(25), { type: 'encounter', speciesId: 10 })
    const legacy = JSON.parse(JSON.stringify(current))
    delete legacy.caughtSpeciesIds
    delete legacy.battle.newBadge
    storage.values.set(SAVE_KEY, JSON.stringify(legacy))
    const loaded = loadGame(storage)
    expect(loaded.status).toBe('loaded')
    expect(loaded.state?.caughtSpeciesIds).toEqual([25])
    expect(loaded.state?.battle?.newBadge).toBe(false)
    const caught = reduceGame(loaded.state!, { type: 'catch' }, () => 0)
    expect(caught.caughtSpeciesIds).toEqual([25, 10])
    expect(saveGame(caught, storage).ok).toBe(true)
  })
  it('does not overwrite the old game database and does not silently accept a corrupt save', () => {
    const storage = memory()
    storage.values.set('old-pokemon-game', 'keep me')
    storage.values.set(SAVE_KEY, JSON.stringify({ version: 2, roster: [] }))
    expect(loadGame(storage).status).toBe('corrupt')
    expect(loadGame(storage).state).toBeNull()
    expect(storage.values.get('old-pokemon-game')).toBe('keep me')
    expect(storage.values.get(SAVE_KEY)).toBe(JSON.stringify({ version: 2, roster: [] }))
  })
  it('distinguishes an empty device, an unreadable backup, and inaccessible storage', () => {
    const storage = memory()
    expect(loadGame(storage).status).toBe('empty')
    storage.values.set(BACKUP_KEY, 'not json')
    expect(loadGame(storage).status).toBe('corrupt')
    const blocked: StorageLike = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(loadGame(blocked).status).toBe('unavailable')
    expect(saveGame(createGame(25), blocked).ok).toBe(false)
  })
  it('reports quota errors and silent write failures rather than pretending to save', () => {
    const quota: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(saveGame(createGame(25), quota)).toMatchObject({ ok: false })
    const silent: StorageLike = { getItem: () => null, setItem: () => undefined }
    expect(saveGame(createGame(25), silent).ok).toBe(false)
  })
  it('rejects tampered state, invalid health, foreign species and broken party links', () => {
    const mutations: ((state: any) => void)[] = [
      state => { state.version = 1 },
      state => { state.roster[0].speciesId = 999 },
      state => { state.roster[0].hp = 100000 },
      state => { state.roster[0].level = -1 },
      state => { state.roster[0].xp = Number.NaN },
      state => { state.teamIds = ['missing'] },
      state => { state.teamIds = [] },
      state => { state.leaderId = 'missing' },
      state => { state.berries = -1 },
      state => { state.seen = [] },
      state => { state.caughtSpeciesIds = [] },
      state => { state.caughtSpeciesIds = [25, 999] },
      state => { state.caughtSpeciesIds = [25, 25] },
      state => { state.badges = ['invisible'] },
      state => { state.area = 'cave' },
      state => { state.nextCreatureId = 1 },
      state => { state.settings.reducedMotion = 'yes' },
    ]
    for (const mutate of mutations) {
      const state = createGame(25)
      mutate(state)
      expect(validateGame(state)).toBeNull()
    }
    expect(validateGame({ __proto__: { version: 2 } })).toBeNull()
  })
  it('rejects impossible battles and strips unknown fields from a valid snapshot', () => {
    const state = reduceGame(createGame(25), { type: 'encounter', speciesId: 10 })
    const invalid = JSON.parse(JSON.stringify(state))
    invalid.battle.rewardClaimed = true
    expect(validateGame(invalid)).toBeNull()
    invalid.battle.rewardClaimed = false
    invalid.battle.newBadge = true
    expect(validateGame(invalid)).toBeNull()
    invalid.battle.newBadge = false
    invalid.battle.activeId = 'missing'
    expect(validateGame(invalid)).toBeNull()
    const extra = { ...state, secret: 'not carried into live state' }
    expect(validateGame(extra)).not.toHaveProperty('secret')
  })
})
