import { describe, expect, it } from 'vitest'
import { AREAS, SPECIES, effectiveness } from './data'
import { availableSpecies, canEvolve, canTravel, createGame, getLeader, isAdventureComplete, maxHp, reduceGame, type GameState } from './engine'
import { validateGame } from './save'

const low = () => 0
const high = () => 0.99
function start(state: GameState, speciesId = 10): GameState { return reduceGame(state, { type: 'encounter', speciesId }, low) }
function capture(state: GameState, speciesId = 10): GameState {
  let next = start(state, speciesId)
  next = reduceGame(next, { type: 'catch' }, low)
  return reduceGame(next, { type: 'finishBattle' })
}

describe('visual adventure rules', () => {
  it('starts with a visible, healthy starter and safely handles an invalid choice', () => {
    const state = createGame(25)
    expect(getLeader(state)).toMatchObject({ speciesId: 25, level: 3 })
    expect(getLeader(state).hp).toBe(maxHp(getLeader(state)))
    expect(createGame(999).roster[0].speciesId).toBe(25)
    expect(validateGame(state)).not.toBeNull()
  })
  it('keeps the caller state untouched and restricts encounters to the actual area', () => {
    const state = createGame(25)
    const original = JSON.stringify(state)
    const next = start(state)
    expect(next.battle?.enemy.speciesId).toBe(10)
    expect(JSON.stringify(state)).toBe(original)
    expect(start(state, 95).battle).toBeNull()
    expect(reduceGame(state, { type: 'travel', area: 'cave' }).area).toBe('meadow')
  })
  it('guarantees the first capture, records a real partner, and never repeats the reward', () => {
    const state = start(createGame(25))
    const caught = reduceGame(state, { type: 'catch' }, high)
    expect(caught.battle?.status).toBe('caught')
    expect(caught.roster).toHaveLength(2)
    expect(caught.teamIds).toContain(caught.battle?.caughtId)
    expect(caught.roster[0].xp).toBe(10)
    expect(caught.events.some(event => event.kind === 'catch-success')).toBe(true)
    expect(reduceGame(caught, { type: 'catch' }, low)).toBe(caught)
    expect(reduceGame(caught, { type: 'attack', moveIndex: 0 }, low)).toBe(caught)
    expect(canTravel(caught, 'lake')).toBe(true)
    expect(validateGame(caught)).not.toBeNull()
  })
  it('sends captured partners to camp when the three places are taken', () => {
    let state = createGame(25)
    state = capture(state, 10)
    state = capture(state, 16)
    const full = reduceGame(start(state, 133), { type: 'catch' }, low)
    expect(full.roster).toHaveLength(4)
    expect(full.teamIds).toHaveLength(3)
    expect(full.teamIds).not.toContain(full.battle?.caughtId)
    expect(full.events[0].message).toContain('营地')
    const dismissed = reduceGame(full, { type: 'finishBattle' })
    const removed = reduceGame(dismissed, { type: 'toggleTeam', creatureId: dismissed.teamIds[1] })
    const added = reduceGame(removed, { type: 'toggleTeam', creatureId: full.battle!.caughtId! })
    expect(added.teamIds).toContain(full.battle?.caughtId)
    expect(validateGame(added)).not.toBeNull()
  })
  it('uses visual catch readiness and guarantees the next ready attempt after a miss', () => {
    let state = capture(createGame(25))
    state = start(state, 133)
    const miss = reduceGame(state, { type: 'catch' }, high)
    expect(miss.battle?.status).toBe('active')
    expect(miss.events[0].kind).toBe('catch-fail')
    const attacked = reduceGame(miss, { type: 'attack', moveIndex: 0 }, low)
    expect(attacked.battle?.catchReady).toBe(true)
    const readyMiss = reduceGame(attacked, { type: 'catch' }, high)
    expect(readyMiss.battle?.failedReadyCatches).toBe(1)
    const caught = reduceGame(readyMiss, { type: 'catch' }, high)
    expect(caught.battle?.status).toBe('caught')
  })
  it('lets wild encounters leave immediately but announces guardian restrictions', () => {
    const wild = start(createGame(7))
    expect(reduceGame(wild, { type: 'leave' }).battle).toBeNull()
    const boss = reduceGame(createGame(7), { type: 'encounter', boss: true }, low)
    expect(reduceGame(boss, { type: 'leave' }).battle?.status).toBe('active')
    expect(reduceGame(boss, { type: 'catch' }).roster).toHaveLength(1)
    expect(reduceGame(boss, { type: 'catch' }).battle?.turn).toBe(0)
  })
  it('switches exhausted partners automatically and safely returns an exhausted team to camp', () => {
    let state = capture(createGame(25))
    state.roster[0].hp = 1
    state = start(state, 133)
    const switched = reduceGame(state, { type: 'attack', moveIndex: 0 }, low)
    expect(switched.battle?.activeId).toBe(switched.teamIds[1])
    expect(switched.events.some(event => event.kind === 'switch')).toBe(true)
    const alone = createGame(25)
    alone.roster[0].hp = 1
    const lost = reduceGame(start(alone, 133), { type: 'attack', moveIndex: 0 }, low)
    expect(lost.battle?.status).toBe('lost')
    expect(lost.area).toBe('camp')
    expect(lost.roster).toHaveLength(1)
    expect(lost.roster[0].hp).toBe(maxHp(lost.roster[0]))
    expect(validateGame(lost)).not.toBeNull()
  })
  it('does not spend a turn for an invalid switch and gives valid switches their enemy response', () => {
    let state = capture(createGame(25))
    state = start(state, 133)
    expect(reduceGame(state, { type: 'switch', creatureId: 'not-in-party' })).toBe(state)
    const next = reduceGame(state, { type: 'switch', creatureId: state.teamIds[1] }, low)
    expect(next.battle?.activeId).toBe(state.teamIds[1])
    expect(next.battle?.turn).toBe(1)
    expect(next.events.map(event => event.kind)).toEqual(['switch', 'damage'])
  })
  it('preserves a valid leader and at least one member while arranging the team', () => {
    const single = createGame(25)
    expect(reduceGame(single, { type: 'toggleTeam', creatureId: single.leaderId }).teamIds).toHaveLength(1)
    const state = capture(single)
    const removed = reduceGame(state, { type: 'toggleTeam', creatureId: state.leaderId })
    expect(removed.teamIds).toContain(removed.leaderId)
    expect(getLeader(removed).speciesId).toBe(10)
    expect(validateGame(removed)).not.toBeNull()
  })
  it('heals with a finite berry, refuses waste, and replenishes at camp', () => {
    const healthy = createGame(25)
    expect(reduceGame(healthy, { type: 'berry', creatureId: healthy.leaderId }).berries).toBe(3)
    healthy.roster[0].hp = 5
    const healed = reduceGame(healthy, { type: 'berry', creatureId: healthy.leaderId })
    expect(healed.berries).toBe(2)
    expect(healed.roster[0].hp).toBeGreaterThan(5)
    const camp = reduceGame(healed, { type: 'travel', area: 'camp' })
    expect(camp.berries).toBe(3)
    expect(camp.roster[0].hp).toBe(maxHp(camp.roster[0]))
  })
  it('evolves only on request, keeps identity and team placement, and updates the dex', () => {
    const state = capture(createGame(25))
    state.roster[1].level = 4
    expect(canEvolve(state.roster[1])).toBe(true)
    const evolved = reduceGame(state, { type: 'evolve', creatureId: state.roster[1].id })
    expect(evolved.roster[1].speciesId).toBe(11)
    expect(evolved.roster[1].id).toBe(state.roster[1].id)
    expect(evolved.seen).toContain(11)
    expect(evolved.events[0].kind).toBe('evolve')
    expect(reduceGame(start(state), { type: 'evolve', creatureId: state.roster[1].id }).roster[1].speciesId).toBe(10)
    expect(validateGame(evolved)).not.toBeNull()
  })
  it('permanently remembers caught forms across both steps of an evolution', () => {
    let state = capture(createGame(25))
    const partnerId = state.roster[1].id
    expect(state.caughtSpeciesIds).toEqual([25, 10])
    state.roster[1].level = 6
    state = reduceGame(state, { type: 'evolve', creatureId: partnerId })
    state = reduceGame(state, { type: 'evolve', creatureId: partnerId })
    expect(state.roster[1].speciesId).toBe(12)
    expect(state.caughtSpeciesIds).toEqual([25, 10, 11, 12])
    const restored = validateGame(JSON.parse(JSON.stringify(state)))!
    expect(restored.caughtSpeciesIds).toEqual([25, 10, 11, 12])
    expect(restored.roster.some(creature => creature.speciesId === 10)).toBe(false)
    expect(restored.caughtSpeciesIds).toContain(10)
  })
  it('marks a badge as new only on the first guardian victory', () => {
    let state = createGame(25)
    state.roster[0].level = 12
    state.roster[0].hp = maxHp(state.roster[0])
    const winGuardian = (current: GameState) => {
      let battle = reduceGame(current, { type: 'encounter', boss: true }, low)
      for (let turn = 0; battle.battle?.status === 'active' && turn < 20; turn++) battle = reduceGame(battle, { type: 'attack', moveIndex: 0 }, low)
      expect(battle.battle?.status).toBe('won')
      return battle
    }
    state = winGuardian(state)
    expect(state.battle?.newBadge).toBe(true)
    expect(state.events.find(event => event.kind === 'win')?.message).toContain('获得绿叶徽章')
    state = reduceGame(state, { type: 'finishBattle' })
    state = reduceGame(state, { type: 'travel', area: 'camp' })
    state = reduceGame(state, { type: 'travel', area: 'meadow' })
    state = winGuardian(state)
    expect(state.battle?.newBadge).toBe(false)
    expect(state.badges).toEqual(['meadow'])
    expect(state.events.find(event => event.kind === 'win')?.message).toContain('经验')
    expect(state.events.find(event => event.kind === 'win')?.message).not.toContain('获得')
    expect(validateGame(state)?.battle?.newBadge).toBe(false)
  })
  it('unlocks each guardian species as a catchable wild discovery only after its badge', () => {
    let state = capture(createGame(25))
    state.roster[0].level = 12
    state.roster[0].hp = maxHp(state.roster[0])
    for (const area of ['meadow', 'lake', 'cave'] as const) {
      state = reduceGame(state, { type: 'travel', area: 'camp' })
      state = reduceGame(state, { type: 'travel', area })
      const guardianId = AREAS[area].bossSpeciesId!
      expect(availableSpecies(state)).not.toContain(guardianId)
      expect(reduceGame(state, { type: 'encounter', speciesId: guardianId }).battle).toBeNull()
      state = reduceGame(state, { type: 'encounter', boss: true }, low)
      const rosterBefore = state.roster.length
      const refused = reduceGame(state, { type: 'catch' }, low)
      expect(refused.battle?.kind).toBe('boss')
      expect(refused.battle?.status).toBe('active')
      expect(refused.roster).toHaveLength(rosterBefore)
      expect(refused.battle?.turn).toBe(0)
      for (let turn = 0; state.battle?.status === 'active' && turn < 20; turn++) state = reduceGame(state, { type: 'attack', moveIndex: 0 }, low)
      expect(state.battle?.status).toBe('won')
      state = reduceGame(state, { type: 'finishBattle' })
      expect(availableSpecies(state)).toContain(guardianId)
      expect(AREAS[area].speciesIds).not.toContain(guardianId)
      state = reduceGame(state, { type: 'encounter', speciesId: guardianId }, low)
      expect(state.battle?.kind).toBe('wild')
      expect(state.battle?.enemy.level).toBe(AREAS[area].level)
      expect(validateGame(state)).not.toBeNull()
      state = reduceGame(state, { type: 'catch' }, low)
      expect(state.battle?.status).toBe('caught')
      expect(state.caughtSpeciesIds).toContain(guardianId)
      expect(validateGame(state)).not.toBeNull()
      state = reduceGame(state, { type: 'finishBattle' })
    }
    expect(state.caughtSpeciesIds).toEqual(expect.arrayContaining([12, 130, 95]))
  })
  it('makes every entry in the discovery book obtainable through encounters and evolution', () => {
    const state = createGame(25)
    state.badges = ['meadow', 'lake', 'cave']
    const obtainable = new Set(['meadow', 'lake', 'cave'].flatMap(area => availableSpecies(state, area as 'meadow' | 'lake' | 'cave')))
    let added = true
    while (added) {
      added = false
      for (const id of [...obtainable]) {
        const evolution = SPECIES[id].evolution
        if (evolution && !obtainable.has(evolution.id)) { obtainable.add(evolution.id); added = true }
      }
    }
    expect([...obtainable].sort((a, b) => a - b)).toEqual(Object.keys(SPECIES).map(Number).sort((a, b) => a - b))
  })
  it('finishes three guardians, unlocks the next region, and cannot claim a win twice', () => {
    let state = capture(createGame(25))
    state = capture(state, 1)
    state.roster.forEach(creature => { creature.level = 12; creature.hp = maxHp(creature) })
    for (const area of ['meadow', 'lake', 'cave'] as const) {
      state = reduceGame(state, { type: 'travel', area })
      expect(state.area).toBe(area)
      state = reduceGame(state, { type: 'encounter', boss: true }, low)
      expect(state.battle?.enemy.speciesId).toBe(AREAS[area].bossSpeciesId)
      let turns = 0
      while (state.battle?.status === 'active' && turns++ < 20) state = reduceGame(state, { type: 'attack', moveIndex: 0 }, low)
      expect(state.battle?.status).toBe('won')
      expect(state.badges).toContain(area)
      const once = JSON.stringify(state)
      expect(reduceGame(state, { type: 'attack', moveIndex: 0 }, low)).toBe(state)
      expect(JSON.stringify(state)).toBe(once)
      expect(validateGame(state)).not.toBeNull()
      state = reduceGame(state, { type: 'finishBattle' })
      state = reduceGame(state, { type: 'travel', area: 'camp' })
    }
    expect(isAdventureComplete(state)).toBe(true)
  })
  it('handles boundary random values without undefined species or health corruption', () => {
    for (const random of [() => -1, () => 1, () => Number.NaN, () => Number.POSITIVE_INFINITY]) {
      let state = reduceGame(createGame(25), { type: 'encounter' }, random)
      expect(SPECIES[state.battle!.enemy.speciesId]).toBeDefined()
      state = reduceGame(state, { type: 'attack', moveIndex: 0 }, random)
      expect(validateGame(state)).not.toBeNull()
    }
    expect(effectiveness('water', 'rock')).toBeGreaterThan(effectiveness('water', 'grass'))
  })
  it.each([25, 4, 7])('lets starter %i finish the adventure with two early captures and no grinding', starterId => {
    let state = createGame(starterId)
    for (const speciesId of [10, 16]) {
      state = start(state, speciesId)
      state = reduceGame(state, { type: 'attack', moveIndex: 1 }, low)
      state = reduceGame(state, { type: 'catch' }, low)
      state = reduceGame(state, { type: 'finishBattle' })
    }
    for (const area of ['meadow', 'lake', 'cave'] as const) {
      state = reduceGame(state, { type: 'travel', area: 'camp' })
      state = reduceGame(state, { type: 'travel', area })
      state = reduceGame(state, { type: 'encounter', boss: true }, low)
      let turns = 0
      while (state.battle?.status === 'active' && turns++ < 12) {
        const active = state.roster.find(creature => creature.id === state.battle!.activeId)!
        const species = SPECIES[active.speciesId]
        const defender = SPECIES[state.battle.enemy.speciesId]
        const powers = species.moves.map(move => move.power * effectiveness(move.type, defender.type))
        state = reduceGame(state, { type: 'attack', moveIndex: powers[0] >= powers[1] ? 0 : 1 }, () => 0.5)
        expect(validateGame(state)).not.toBeNull()
      }
      expect(state.battle?.status).toBe('won')
      expect(turns).toBeLessThanOrEqual(6)
      state = reduceGame(state, { type: 'finishBattle' })
    }
    expect(isAdventureComplete(state)).toBe(true)
  })
})
