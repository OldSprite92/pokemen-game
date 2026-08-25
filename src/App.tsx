import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from './stores/gameStore'
import { migrateLegacyMonsterOwnership } from './db/database'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import BattleSelectPage from './pages/BattleSelectPage'
import BattlePage from './pages/BattlePage'
import TrainerPage from './pages/TrainerPage'
import PokedexPage from './pages/PokedexPage'
import AdventurePage from './pages/AdventurePage'
import MapPage from './pages/MapPage'
import MultiplayerPage from './pages/MultiplayerPage'
import MultiplayerBattlePage from './pages/MultiplayerBattlePage'
import GymPage from './pages/GymPage'
import GymBattlePage from './pages/GymBattlePage'
import BackpackPage from './pages/BackpackPage'
import HospitalPage from './pages/HospitalPage'

function AppInitializer() {
  useEffect(() => {
    // 应用启动时从数据库恢复状态
    const restore = async () => {
      await migrateLegacyMonsterOwnership();
      await useGameStore.getState().restoreTrainerFromDB();
      await useGameStore.getState().restoreAdventureFromDB();
    };
    restore();
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/battle-select" element={<BattleSelectPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/trainer" element={<TrainerPage />} />
        <Route path="/pokedex" element={<PokedexPage />} />
        <Route path="/warehouse" element={<PokedexPage />} />
        <Route path="/adventure" element={<AdventurePage />} />
        <Route path="/map/:continentId" element={<MapPage />} />
        <Route path="/gym/:continentId" element={<GymPage />} />
        <Route path="/gym-battle/:continentId" element={<GymBattlePage />} />
        <Route path="/multiplayer" element={<MultiplayerPage />} />
        <Route path="/team-battle" element={<MultiplayerBattlePage />} />
        <Route path="/backpack" element={<BackpackPage />} />
        <Route path="/hospital" element={<HospitalPage />} />
      </Routes>
    </BrowserRouter>
  )
}
