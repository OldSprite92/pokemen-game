import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import BattleSelectPage from './pages/BattleSelectPage'
import BattlePage from './pages/BattlePage'
import TrainerPage from './pages/TrainerPage'
import PokedexPage from './pages/PokedexPage'
import AdventurePage from './pages/AdventurePage'
import MapPage from './pages/MapPage'
import MultiplayerPage from './pages/MultiplayerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/battle-select" element={<BattleSelectPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/trainer" element={<TrainerPage />} />
        <Route path="/pokedex" element={<PokedexPage />} />
        <Route path="/adventure" element={<AdventurePage />} />
        <Route path="/map/:continentId" element={<MapPage />} />
        <Route path="/multiplayer" element={<MultiplayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
