import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Save player identity to localStorage for session
      localStorage.setItem('player', JSON.stringify({
        id: data.id,
        name: data.name,
        schoolId: data.schoolId
      }));
      
      // Load player game state from backend
      let playerState;
      try {
        const playerRes = await fetch(`http://localhost:4000/api/player/${data.id}`);
        if (playerRes.ok) {
          playerState = await playerRes.json();
        } else {
          // Player doesn't exist in game state table - create default
          playerState = {
            id: data.id,
            name: data.name,
            level: 1,
            xp: 0,
            coins: 100,
            fatigue: 0,
            backpackSize: 10,
            backpackLevel: 1,
            inventory: [],
            nameChangeCost: 100,
            avatar: data.avatar || 'Avatar001.png',
            schoolId: data.schoolId,
            cooldownUntil: 0,
            lastDailyTreasure: 0,
            lastActive: Date.now(),
            lastLessonAwarded: 0,
            stats: { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 }
          };
          
          // Save to backend
          await fetch(`http://localhost:4000/api/player/${data.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playerState)
          });
        }
      } catch (err) {
        console.error('Error loading player state:', err);
        // Fallback to default state
        playerState = {
          id: data.id,
          name: data.name,
          level: 1,
          xp: 0,
          coins: 100,
          fatigue: 0,
          backpackSize: 10,
          backpackLevel: 1,
          inventory: [],
          nameChangeCost: 100,
          avatar: data.avatar || 'Avatar001.png',
          schoolId: data.schoolId,
          cooldownUntil: 0,
          lastDailyTreasure: 0,
          lastActive: Date.now(),
          lastLessonAwarded: 0,
          stats: { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 }
        };
      }
      
      // Load schools from backend
      const schoolsRes = await fetch('http://localhost:4000/api/schools');
      const schools = await schoolsRes.json();
      
      // Load game state from backend
      const gameStateRes = await fetch('http://localhost:4000/api/gamestate');
      const gameStateData = await gameStateRes.json();
      
      // Create game state with backend data
      const gameState = {
        player: playerState,
        schools: schools,
        activeTags: gameStateData.activeTags || [],
        globalLogs: gameStateData.globalLogs || [],
        lastTreasureReset: gameStateData.lastTreasureReset || 0,
        easterEggsEnabled: gameStateData.easterEggsEnabled || false,
        lessonStart: gameStateData.lessonStart || Date.now()
      };
      
      localStorage.setItem('school_vandals_save_v20', JSON.stringify(gameState));
      
      // Go to dashboard and reload the app to reflect login
      window.location.hash = '#/';
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-black text-blue-900 mb-2 uppercase text-center">Log In</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        {error && <div className="text-red-600 font-bold text-center">{error}</div>}
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-blue-500 transition-all"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <button
          type="button"
          className="w-full py-3 bg-slate-100 text-blue-900 font-black uppercase rounded-xl shadow hover:bg-slate-200 transition-all"
          onClick={() => navigate('/register')}
        >
          Create Account
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
