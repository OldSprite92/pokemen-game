import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { AREAS, SPECIES, type AreaId } from './data'
import { createGame, getLeader, reduceGame, type GameAction, type GameState } from './engine'
import { loadGame, saveGame } from './save'
import { ActionButton, Icon, Item, Modal, Sprite } from './components'
import { MapPanel, StarterScreen, WorldScreen } from './WorldScreen'
import { BattleScreen } from './BattleScreen'
import { BagPanel, DexPanel, TeamPanel } from './CollectionScreen'

type Panel = 'map'|'team'|'bag'|'dex'|'settings'|'badges'|'boss'|'exit'|null
const BADGES: {area:AreaId;icon:'leaf'|'water'|'rock'}[]=[{area:'meadow',icon:'leaf'},{area:'lake',icon:'water'},{area:'cave',icon:'rock'}]
export default function GameApp() {
  const [loaded] = useState(() => loadGame())
  const [game, setGame] = useState<GameState|null>(loaded.state)
  const latest=useRef(game)
  const [panel,setPanel]=useState<Panel>(null)
  const backHandler=useRef<()=>void>(()=>{})
  const [teamSelection,setTeamSelection]=useState<string|undefined>()
  const [saveError,setSaveError]=useState(loaded.status==='unavailable'?loaded.message:'')
  const [notice,setNotice]=useState(loaded.status==='recovered'||loaded.status==='corrupt'?loaded.message:'')
  const [systemReduced,setSystemReduced]=useState(()=>typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');if(!query)return;const change=()=>setSystemReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[])
  useEffect(()=>{backHandler.current=()=>panel?setPanel(null):setPanel('exit')},[panel])
  useEffect(()=>{
    if(!Capacitor.isNativePlatform())return
    let cancelled=false
    let handle:{remove:()=>Promise<void>}|undefined
    void NativeApp.addListener('backButton',()=>backHandler.current()).then(listener=>{if(cancelled)void listener.remove();else handle=listener})
    return()=>{cancelled=true;void handle?.remove()}
  },[])
  function commit(next:GameState) {latest.current=next;setGame(next);const result=saveGame(next);setSaveError(result.ok?'':result.message)}
  function act(action:GameAction) {
    const current=latest.current
    if(!current)return
    const next=reduceGame(current,action)
    commit(next)
    if(current.battle?.status==='active' && ['berry','switch'].includes(action.type) && next.revision!==current.revision)setPanel(null)
    if(['heal','berry','setLeader','toggleTeam','evolve','travel','finishBattle','leave'].includes(action.type)){
      const event=next.events[next.events.length-1]
      setNotice(action.type==='finishBattle'||action.type==='leave' ? AREAS[next.area].description : event?.message || AREAS[next.area].description)
    }
  }
  function travel(area:AreaId){act({type:'travel',area});setPanel(null)}
  function openTeam(id?:string){setTeamSelection(id);setPanel('team')}
  function finishBattle(showPartner=false){const caughtId=latest.current?.battle?.caughtId;act({type:'finishBattle'});if(showPartner)openTeam(caughtId)}
  const isBattle=!!game?.battle
  const title=game?AREAS[game.area].name:'一起去冒险'
  return <div className="journey-shell" data-reduced-motion={systemReduced||game?.settings.reducedMotion?'true':'false'}>
    <header className="game-header"><div className="brand-mark" aria-hidden="true"><Item name="poke-ball"/></div><div className="header-title"><span>{game?'森野小岛 · 宝可梦冒险':'宝可梦 · 森野小岛'}</span><h1>{title}</h1></div>{game&&<><button type="button" className="badge-strip" onClick={()=>setPanel('badges')} aria-label={`冒险徽章，已获得${game.badges.length}枚，共3枚`}>{BADGES.map(b=><span key={b.area} className={`mini-badge badge-${b.area} ${game.badges.includes(b.area)?'earned':''}`}><Icon name={b.icon}/></span>)}</button><button type="button" className="icon-button settings-trigger" onClick={()=>setPanel('settings')} aria-label="设置"><Icon name="settings"/></button></>}</header>
    {saveError&&<div className="save-error" role="alert">{saveError}<button type="button" onClick={()=>{if(game)commit(game)}}>重试保存</button></div>}
    {!game&&notice&&<p className="recovery-notice" role="status">{notice}</p>}
    {!game?<StarterScreen onChoose={id=>{commit(createGame(id));setNotice('点点草丛里的绿毛虫，认识第一位新伙伴。')}}/>:isBattle?<BattleScreen game={game} act={act} onBag={()=>setPanel('bag')} onCompanion={()=>finishBattle(true)} onContinue={()=>finishBattle()}/>:<WorldScreen key={game.area} game={game} act={act} onBoss={()=>setPanel('boss')} onTeam={openTeam}/>}
    {game&&!isBattle&&<nav className="adventure-dock" aria-label="冒险工具"><button type="button" onClick={()=>setPanel('map')}><Item name="town-map"/><span>地图<small>去新地方</small></span></button><button type="button" onClick={()=>openTeam()}><Sprite id={getLeader(game).speciesId} decorative/><span>伙伴<small>{game.teamIds.length} 位在身边</small></span></button><button type="button" onClick={()=>setPanel('bag')}><Item name="explorer-kit"/><span>背包<small>精灵球与树果</small></span></button><button type="button" onClick={()=>setPanel('dex')}><Icon name="book"/><span>图鉴<small>记录每次相遇</small></span></button></nav>}
    {game&&!isBattle&&<footer className="game-footer"><span className="world-notice" role="status">{notice||AREAS[game.area].description}</span><span className={`save-status ${saveError?'failed':''}`}><Icon name={saveError?'close':'check'}/>{saveError?'保存遇到问题':'已自动保存'}</span></footer>}
    {game&&panel==='map'&&<Modal title="下一站，去哪里？" subtitle="森野小岛" onClose={()=>setPanel(null)} className="map-dialog"><MapPanel game={game} onTravel={travel}/></Modal>}
    {game&&panel==='team'&&<Modal title="我的伙伴" subtitle="一起走过的小路，都算数" onClose={()=>setPanel(null)} className="team-dialog"><TeamPanel game={game} act={act} initialId={teamSelection}/><p className="panel-feedback" role="status">{notice}</p></Modal>}
    {game&&panel==='bag'&&<Modal title="冒险背包" subtitle="准备好，照顾你的伙伴" onClose={()=>setPanel(null)}><BagPanel game={game} act={act}/><p className="panel-feedback" role="status">{notice}</p></Modal>}
    {game&&panel==='dex'&&<Modal title="我的发现图鉴" subtitle="一个小岛，许多新朋友" onClose={()=>setPanel(null)}><DexPanel game={game}/></Modal>}
    {game&&panel==='boss'&&<Modal title={AREAS[game.area].bossName||'守护者挑战'} subtitle={AREAS[game.area].name} onClose={()=>setPanel(null)} className="guardian-dialog"><div className="guardian-preview"><Sprite id={AREAS[game.area].bossSpeciesId!}/><h3>{SPECIES[AREAS[game.area].bossSpeciesId!].name}</h3><p>带上精神满满的伙伴，一起争取{AREAS[game.area].badgeName}！</p><p className="help-text">挑战中不能捕捉或离开。伙伴累了会回营地，不会丢失进度。</p><ActionButton primary icon={<Icon name="flag"/>} onClick={()=>{act({type:'encounter',boss:true});setPanel(null)}}>我们准备好了</ActionButton><button type="button" className="text-button" onClick={()=>setPanel(null)}>再准备一下</button></div></Modal>}
    {game&&panel==='badges'&&<Modal title={game.badges.length===3?'小岛探险家！':'我们的冒险足迹'} subtitle="每枚徽章，都是一起努力的证明" onClose={()=>setPanel(null)}><div className="badge-collection">{BADGES.map(b=><div key={b.area} className={game.badges.includes(b.area)?'earned':'unearned'}><div className={`large-badge badge-${b.area}`}><Icon name={b.icon}/></div><h3>{AREAS[b.area].badgeName}</h3><p>{AREAS[b.area].name}</p><span>{game.badges.includes(b.area)?'已经获得':'等待挑战'}</span></div>)}</div><p className="badge-message">{game.badges.length===3?'三位守护者都认可了你们！继续收集伙伴、见证进化，写下新的冒险。':'去不同的区域认识守护者，用你和伙伴的默契赢得徽章。'}</p></Modal>}
    {game&&panel==='settings'&&<Modal title="冒险设置" onClose={()=>setPanel(null)} className="settings-dialog"><label className="setting-row"><span><strong>减少动画</strong><small>减少移动与庆祝效果，操作保持完整。</small></span><input type="checkbox" checked={game.settings.reducedMotion} onChange={e=>act({type:'settings',reducedMotion:e.target.checked})}/></label>{systemReduced&&<p className="help-text">已跟随设备的“减少动态效果”设置。</p>}<div className="settings-info"><Icon name="shield"/><div><strong>随时停下，下次继续</strong><p>进度保存在这台设备。游戏与宝可梦素材可以离线使用。</p></div></div><p className="version-label">宝可梦·一起冒险　2.0.0</p></Modal>}
    {panel==='exit'&&<Modal title="这次先玩到这里？" onClose={()=>setPanel(null)} className="settings-dialog"><p>{saveError?'保存暂时不可用，退出可能丢失刚才的进度。':'进度已经记好了，下次会从这里继续。'}</p><div className="result-actions"><ActionButton primary onClick={()=>setPanel(null)}>继续冒险</ActionButton><ActionButton onClick={()=>void NativeApp.exitApp()}>{saveError?'仍然退出':'下次再来'}</ActionButton></div></Modal>}
  </div>
}
