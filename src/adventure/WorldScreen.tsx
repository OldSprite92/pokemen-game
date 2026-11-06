import { useState, type CSSProperties, type MouseEvent } from 'react'
import { AREAS, SPECIES, STARTERS, type AreaId } from './data'
import { canTravel, getLeader, type GameState, type GameAction } from './engine'
import { ActionButton, Health, Icon, Item, Sprite, TypeTag } from './components'

export function StarterScreen({ onChoose }: { onChoose: (id: number) => void }) {
  const [selected, setSelected] = useState<number>(25)
  return <main className="welcome-screen"><div className="welcome-shade"/><div className="welcome-copy"><span className="eyebrow">森野小岛 · 一段新的旅程</span><h1>一起去冒险<span>从遇见你开始。</span></h1><p>选一位伙伴，去看看这个世界。</p></div><div className="starter-choices" aria-label="选择初始伙伴">{STARTERS.map(id => <button type="button" key={id} className={`starter-choice ${selected === id ? 'selected' : ''}`} onClick={() => setSelected(id)} aria-pressed={selected === id}><span className="starter-check">{selected === id ? <Icon name="check"/> : null}</span><Sprite id={id}/><span className="starter-name">{SPECIES[id].name}</span><TypeTag type={SPECIES[id].type}/></button>)}</div><ActionButton primary className="start-button" icon={<Icon name="foot"/>} onClick={() => onChoose(selected)}>和{SPECIES[selected].name}出发<Icon name="arrow"/></ActionButton><p className="welcome-note">进度自动保存 · 随时回来继续冒险</p></main>
}

const positions: [number, number][] = [[28, 45], [65, 62], [76, 33]]
export function WorldScreen({ game, act, onBoss, onTeam }: { game: GameState; act: (action: GameAction) => void; onBoss: () => void; onTeam: (id?: string) => void }) {
  const [point, setPoint] = useState({ x: 48, y: 64 })
  const area = AREAS[game.area], leader = getLeader(game)
  const caughtIds = new Set(game.caughtSpeciesIds)
  const species = !game.tutorialCaptured && game.area === 'meadow' ? [10] : Array.from({ length: Math.min(3, area.speciesIds.length) }, (_, i) => area.speciesIds[(game.encounters + i) % area.speciesIds.length])
  if (area.bossSpeciesId && game.badges.includes(game.area) && game.encounters % 5 === 0) species.splice(2,1,area.bossSpeciesId)
  const sceneStyle = { '--player-x': `${point.x}%`, '--player-y': `${point.y}%` } as CSSProperties
  function walk(e: MouseEvent<HTMLButtonElement>) { const rect = e.currentTarget.getBoundingClientRect(); if (e.detail === 0) { setPoint(p => ({x:p.x >= 65 ? 38 : p.x + 12,y:p.y})); return }; setPoint({ x: Math.max(14, Math.min(83, (e.clientX - rect.left) / rect.width * 100)), y: Math.max(32, Math.min(79, (e.clientY - rect.top) / rect.height * 100)) }) }
  return <main className={`world-screen area-${game.area}`} style={sceneStyle} aria-label={`${area.name}探索场景`}><div className="world-backdrop"/><button className="walk-surface" aria-label="点击小路移动，键盘按回车向前走" onClick={walk}/><div className="area-caption"><span className="area-dot"/>{area.subtitle}</div><div className="scene-guide"><Icon name={game.area === 'camp' ? 'heart' : 'compass'}/><span>{game.area === 'camp' ? '伙伴休息好了，出发吧！' : !game.tutorialCaptured ? '点点草丛里的绿毛虫' : '点宝可梦，认识新伙伴'}</span></div>
    {game.area === 'camp' ? <><button type="button" className="camp-house scene-object" onClick={() => act({ type: 'heal' })}><Icon name="home"/><span>休息一下</span><small>恢复体力与树果</small></button><div className="camp-companions">{game.roster.slice(0, 5).map(c => <button type="button" key={c.id} onClick={() => onTeam(c.id)} aria-label={`查看${SPECIES[c.speciesId].name}`}><Sprite id={c.speciesId}/></button>)}</div><button type="button" className="path-sign" onClick={() => act({ type: 'travel', area: 'meadow' })}>风铃草地<Icon name="arrow"/></button></> : <>{species.map((id, i) => <button type="button" key={`${game.area}-${id}`} style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }} className="wild-pokemon scene-object" onClick={() => act({ type: 'encounter', speciesId: id })} aria-label={`遇见${SPECIES[id].name}`}><span className="discovery-marker">{caughtIds.has(id) ? <Icon name="check"/> : '!'}</span><Sprite id={id}/><span className="wild-label">{SPECIES[id].name}</span></button>)}<button type="button" className="guardian-sign" onClick={onBoss}><Icon name={game.badges.includes(game.area) ? 'check' : 'flag'}/><span>{game.badges.includes(game.area) ? '再次挑战' : '守护者挑战'}</span></button></>}
    <div className="walking-layer" aria-hidden="true"><div className="walking-party"><img className="trainer-sprite" src="/game/characters/red.png" alt="" width="80" height="80"/><Sprite id={leader.speciesId} decorative className="follower-sprite"/></div></div>
    <button type="button" className="leader-card" onClick={() => onTeam(leader.id)} aria-label={`查看跟随伙伴${SPECIES[leader.speciesId].name}`}><Sprite id={leader.speciesId} decorative/><span><strong>{SPECIES[leader.speciesId].name}</strong><small>Lv. {leader.level} · 跟随中</small><Health creature={leader} compact/></span></button>
  </main>
}

export function MapPanel({ game, onTravel }: { game: GameState; onTravel: (area: AreaId) => void }) {
  const nodes: { id: AreaId; x: number; y: number; icon: 'home'|'leaf'|'water'|'rock' }[] = [{id:'camp',x:20,y:70,icon:'home'},{id:'meadow',x:48,y:54,icon:'leaf'},{id:'lake',x:78,y:47,icon:'water'},{id:'cave',x:66,y:20,icon:'rock'}]
  return <><div className="island-map" aria-label="森野小岛地图">{nodes.map(node => { const open = canTravel(game,node.id); return <button key={node.id} type="button" className={`map-node ${game.area === node.id ? 'current' : ''} ${!open ? 'locked' : ''}`} style={{left:`${node.x}%`,top:`${node.y}%`}} onClick={() => {if(open)onTravel(node.id)}} aria-disabled={!open}><span className="map-node-icon"><Icon name={node.icon}/></span><strong>{AREAS[node.id].name}</strong><small>{game.area === node.id ? '你在这里' : !open ? node.id === 'lake' ? '找到新伙伴后开启' : '获得水滴徽章后开启' : '点击前往'}</small></button>})}</div><div className="map-summary"><Icon name="flag"/><span>收集三枚徽章，成为小岛探险家</span><strong>{game.badges.length} / 3</strong></div></>
}
