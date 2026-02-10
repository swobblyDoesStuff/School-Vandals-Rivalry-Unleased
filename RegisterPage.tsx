import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [real_name, setRealName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('Avatar001.png');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Generate array of avatar filenames (265 avatars)
  const avatars = Array.from({ length: 265 }, (_, i) => `Avatar${String(i + 1).padStart(3, '0')}.png`);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('http://localhost:4000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ real_name, email, password, avatar: selectedAvatar })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      // Save player identity to localStorage
      localStorage.setItem('player', JSON.stringify({
        id: data.id,
        name: data.name,
        schoolId: data.schoolId
      }));
      
      // Create initial player game state
      const playerState = {
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
        avatar: selectedAvatar,
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
      
      // Redirect to home screen
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900 p-4">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-3xl flex flex-col gap-4">
        <h1 className="text-2xl font-black text-blue-900 mb-2 uppercase text-center">Create Account</h1>
        
        {/* Name and Email */}
        <input
          type="text"
          placeholder="Your Name"
          value={real_name}
          onChange={e => setRealName(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        
        {/* Password fields */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="p-3 rounded border-2 border-blue-200 focus:border-blue-500 outline-none font-bold"
          required
        />
        
        {/* Avatar Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-blue-900 text-lg">Choose Your Avatar:</label>
          <div className="border-2 border-blue-200 rounded-lg p-3 bg-slate-50 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {avatars.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative p-1 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedAvatar === avatar 
                      ? 'border-blue-600 bg-blue-100 shadow-lg' 
                      : 'border-slate-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <img 
                    src={`/assets/Avatars/${avatar}`} 
                    alt={avatar}
                    className="w-full h-auto rounded"
                  />
                  {selectedAvatar === avatar && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {error && <div className="text-red-600 font-bold text-center">{error}</div>}
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-blue-500 transition-all"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        <button
          type="button"
          className="w-full py-3 bg-slate-100 text-blue-900 font-black uppercase rounded-xl shadow hover:bg-slate-200 transition-all"
          onClick={() => navigate('/login')}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
