// Express backend for login/register
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

const app = express();
const PORT = 4000;

// Helper function to get a consistent avatar based on NPC ID (deterministic, always the same for a given ID)
const getConsistentAvatarForId = (id) => {
  // Create a hash from the ID to get a consistent number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive number and map to avatar range (1-265)
  const avatarIndex = (Math.abs(hash) % 265) + 1;
  return `Avatar${String(avatarIndex).padStart(3, '0')}.png`;
};

const getSystemAvatar = () => 'SystemAvatar.png';
const getAnonAvatar = () => 'AnonAvatar.png';
const getBrushAvatar = () => 'Brush.png';

app.use(cors());
app.use(bodyParser.json());

// SQLite setup
const db = new Database('accounts.db');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  real_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  avatar TEXT DEFAULT 'Avatar001.png'
)`);

// Create schools table
db.exec(`CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT,
  level INTEGER DEFAULT 1,
  principalId TEXT,
  principalName TEXT,
  memberIds TEXT, -- JSON array
  members TEXT, -- JSON array
  joinRequests TEXT, -- JSON array
  classes TEXT, -- JSON array
  totalTags INTEGER DEFAULT 0,
  totalCleans INTEGER DEFAULT 0,
  schoolPoints INTEGER DEFAULT 0,
  nameChangeCost INTEGER DEFAULT 100
)`);

// Add nameChangeCost column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE schools ADD COLUMN nameChangeCost INTEGER DEFAULT 100`);
} catch (e) {
  // Column already exists, ignore error
}

// Create game state table for global data
db.exec(`CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  activeTags TEXT, -- JSON array
  globalLogs TEXT, -- JSON array
  graffiti TEXT, -- JSON array
  lastTreasureReset INTEGER DEFAULT 0,
  easterEggsEnabled INTEGER DEFAULT 0,
  lessonStart INTEGER DEFAULT 0
)`);

// Add lessonStart column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE game_state ADD COLUMN lessonStart INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists, ignore error
}

// Add graffiti column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE game_state ADD COLUMN graffiti TEXT DEFAULT '[]'`);
} catch (e) {
  // Column already exists, ignore error
}

// Add easterEggsEnabled column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE game_state ADD COLUMN easterEggsEnabled INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists, ignore error
}

// Add avatar column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'Avatar001.png'`);
} catch (e) {
  // Column already exists, ignore error
}

// Create pending rewards table for offline reward collection
db.exec(`CREATE TABLE IF NOT EXISTS pending_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playerId TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  reason TEXT,
  timestamp INTEGER DEFAULT 0
)`);

// Create players table for game state persistence
db.exec(`CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  fatigue INTEGER DEFAULT 0,
  fatigueImmunityExpires INTEGER DEFAULT 0,
  backpackSize INTEGER DEFAULT 10,
  backpackLevel INTEGER DEFAULT 1,
  inventory TEXT DEFAULT '[]',
  nameChangeCost INTEGER DEFAULT 100,
  avatar TEXT DEFAULT 'Avatar001.png',
  schoolId TEXT,
  cooldownUntil INTEGER DEFAULT 0,
  lastDailyTreasure INTEGER DEFAULT 0,
  lastActive INTEGER DEFAULT 0,
  lastLessonAwarded INTEGER DEFAULT 0,
  tagsPlaced INTEGER DEFAULT 0,
  tagsCleaned INTEGER DEFAULT 0,
  treasuresFound INTEGER DEFAULT 0
)`);

// Initialize base schools if none exist
const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools').get();
if (schoolCount.count === 0) {
  console.log('Initializing base schools...');
  const schoolNames = ["Crimson Academy", "Silver Institute", "Golden School", "Emerald College", "Shadow Prep"];
  const principalNames = ["Dr. Grimshaw", "Mrs. Trunchbull", "Mr. Sowerberry", "Prof. Snape", "Headmaster Black"];
  
  for (let i = 0; i < 5; i++) {
    const schoolId = `school-${i + 1}`;
    const npcId = `npc-head-${i + 1}`;
    const npcName = principalNames[i];
    
    db.prepare(`INSERT INTO schools (id, name, level, principalId, principalName, memberIds, members, joinRequests, classes, totalTags, totalCleans, schoolPoints)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      schoolId,
      schoolNames[i],
      1,
      npcId,
      npcName,
      JSON.stringify([npcId]),
      JSON.stringify([{
        id: npcId,
        name: npcName,
        level: 1,
        reputation: 0,
        avatar: getConsistentAvatarForId(npcId),
        lastActive: Date.now()
      }]),
      JSON.stringify([]),
      JSON.stringify([{
        id: 1,
        name: "The Classroom",
        desks: Array.from({length: 5}, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
        blackboardLogs: []
      }]),
      0,
      0,
      0
    );
  }
  console.log('Base schools created successfully');
}

// Initialize game state if not exists
const gameState = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
if (!gameState) {
  db.prepare(`INSERT INTO game_state (id, activeTags, globalLogs, lastTreasureReset, easterEggsEnabled, lessonStart)
    VALUES (?, ?, ?, ?, ?, ?)`).run(1, JSON.stringify([]), JSON.stringify([]), 0, 0, Date.now());
} else if (!gameState.lessonStart) {
  // Migration: set lessonStart if it doesn't exist
  db.prepare(`UPDATE game_state SET lessonStart = ? WHERE id = 1`).run(Date.now());
}

// Migration: Assign avatars to any NPCs that don't have them
let allSchools = db.prepare('SELECT * FROM schools').all();
allSchools.forEach(school => {
  const members = JSON.parse(school.members || '[]');
  let updated = false;
  
  members.forEach(member => {
    if (!member.avatar) {
      member.avatar = getConsistentAvatarForId(member.id);
      updated = true;
    }
  });
  
  if (updated) {
    db.prepare('UPDATE schools SET members = ? WHERE id = ?').run(
      JSON.stringify(members),
      school.id
    );
    console.log(`✅ Assigned avatars to NPC members in school: ${school.name}`);
  }
});

// Random school name generator (defined before migrations)
const schoolPrefixes = ['Royal', 'Green', 'Blue', 'Red', 'North', 'South', 'East', 'West', 'Central', 'Oak', 'Maple', 'Pine', 'Willow', 'Cedar'];
const schoolSuffixes = ['Academy', 'High School', 'College', 'Institute', 'Preparatory', 'Grammar School', 'School'];

function generateRandomSchoolName() {
  const prefix = schoolPrefixes[Math.floor(Math.random() * schoolPrefixes.length)];
  const suffix = schoolSuffixes[Math.floor(Math.random() * schoolSuffixes.length)];
  return `${prefix} ${suffix}`;
}

// Migration: Promote real players to principals in their schools
allSchools = db.prepare('SELECT * FROM schools').all();
const allUsers = db.prepare('SELECT * FROM users').all();

console.log('=== DATABASE STATUS ===');
console.log(`Total users: ${allUsers.length}`);
allUsers.forEach(u => console.log(`  User ID ${u.id}: ${u.real_name} (${u.email})`));
console.log(`Total schools: ${allSchools.length}`);
allSchools.forEach(s => {
  const memberIds = JSON.parse(s.memberIds || '[]');
  console.log(`  School ${s.id}: ${s.name} (Principal: ${s.principalId} - ${s.principalName}, Members: ${memberIds.join(', ')})`);
});
console.log('======================');

for (const school of allSchools) {
  const memberIds = JSON.parse(school.memberIds || '[]');
  const members = JSON.parse(school.members || '[]');
  
  // Find real players in this school (check against actual user database)
  const realPlayerIds = memberIds.filter(id => {
    // Check if this ID exists in the users table
    const isNumeric = /^\d+$/.test(id);
    return isNumeric && allUsers.some(u => String(u.id) === id);
  });
  
  // If there are real players and the current principal is an NPC or not a real player, promote the first real player
  if (realPlayerIds.length > 0) {
    const currentPrincipalIsNPC = school.principalId.startsWith('npc-');
    const currentPrincipalIsRealPlayer = allUsers.some(u => String(u.id) === school.principalId);
    
    if (currentPrincipalIsNPC || !currentPrincipalIsRealPlayer) {
      const newPrincipalId = realPlayerIds[0];
      const newPrincipal = members.find(m => m.id === newPrincipalId);
      const user = allUsers.find(u => String(u.id) === newPrincipalId);
      
      if (newPrincipal && user) {
        db.prepare(`UPDATE schools SET principalId = ?, principalName = ? WHERE id = ?`)
          .run(newPrincipalId, user.real_name, school.id);
        console.log(`✅ Promoted ${user.real_name} (ID: ${newPrincipalId}) to principal of ${school.name}`);
      }
    }
  }
}

// One-time fix: Ensure Bob is principal of school-user-2
const bobUser = db.prepare('SELECT * FROM users WHERE id = 2').get();
if (bobUser) {
  const bobSchool = db.prepare('SELECT * FROM schools WHERE id = ?').get('school-user-2');
  if (bobSchool) {
    const members = JSON.parse(bobSchool.members || '[]');
    const memberIds = JSON.parse(bobSchool.memberIds || '[]');
    
    // Ensure Bob is in the school
    const bobId = '2';
    if (!memberIds.includes(bobId)) {
      memberIds.push(bobId);
      members.push({
        id: bobId,
        name: bobUser.real_name,
        level: 1,
        reputation: 0,
        lastActive: Date.now()
      });
    }
    
    // Remove all other non-Bob members
    const filteredMemberIds = [bobId];
    const filteredMembers = members.filter(m => m.id === bobId);
    
    // Set Bob as principal
    db.prepare(`UPDATE schools SET principalId = ?, principalName = ?, memberIds = ?, members = ? WHERE id = ?`)
      .run(bobId, bobUser.real_name, JSON.stringify(filteredMemberIds), JSON.stringify(filteredMembers), 'school-user-2');
    console.log(`✅ One-time fix: Bob is now principal of school-user-2 (all other members removed)`);
  }
}

// Migration: Create schools for existing users who don't have one
console.log('=== CHECKING FOR USERS WITHOUT SCHOOLS ===');
for (const user of allUsers) {
  const schoolId = `school-user-${user.id}`;
  const existingSchool = db.prepare('SELECT * FROM schools WHERE id = ?').get(schoolId);
  
  if (!existingSchool) {
    const schoolName = generateRandomSchoolName();
    const playerId = String(user.id);
    
    db.prepare(`INSERT INTO schools (id, name, level, principalId, principalName, memberIds, members, joinRequests, classes, totalTags, totalCleans, schoolPoints, nameChangeCost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      schoolId,
      schoolName,
      1,
      playerId,
      user.real_name,
      JSON.stringify([playerId]),
      JSON.stringify([{
        id: playerId,
        name: user.real_name,
        level: 1,
        reputation: 0,
        lastActive: Date.now()
      }]),
      JSON.stringify([]),
      JSON.stringify([{
        id: 1,
        name: "The Classroom",
        desks: Array.from({length: 5}, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
        blackboardLogs: []
      }]),
      0,
      0,
      0,
      100
    );
    console.log(`✅ Created school ${schoolName} (${schoolId}) for user ${user.real_name} (ID: ${user.id})`);
  }
}

// Migration: Assign random avatars to existing users without one
console.log('=== ASSIGNING AVATARS TO EXISTING USERS ===');
const usersWithoutAvatar = db.prepare('SELECT * FROM users WHERE avatar IS NULL OR avatar = \'\'').all();
if (usersWithoutAvatar.length > 0) {
  for (const user of usersWithoutAvatar) {
    const randomAvatarNum = Math.floor(Math.random() * 265) + 1;
    const avatarFilename = `Avatar${String(randomAvatarNum).padStart(3, '0')}.png`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarFilename, user.id);
    console.log(`✅ Assigned ${avatarFilename} to ${user.real_name}`);
  }
}
console.log('=========================================');

// Helper: get player template and create their school
function getPlayerFromUser(user) {
  // Create a new school for this player
  const schoolId = `school-user-${user.id}`;
  const schoolName = generateRandomSchoolName();
  const playerId = String(user.id);
  
  // Check if school already exists
  const existingSchool = db.prepare('SELECT * FROM schools WHERE id = ?').get(schoolId);
  
  if (!existingSchool) {
    // Create new school with player as principal
    db.prepare(`INSERT INTO schools (id, name, level, principalId, principalName, memberIds, members, joinRequests, classes, totalTags, totalCleans, schoolPoints, nameChangeCost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      schoolId,
      schoolName,
      1,
      playerId,
      user.real_name,
      JSON.stringify([playerId]),
      JSON.stringify([{
        id: playerId,
        name: user.real_name,
        level: 1,
        reputation: 0,
        lastActive: Date.now()
      }]),
      JSON.stringify([]),
      JSON.stringify([{
        id: 1,
        name: "The Classroom",
        desks: Array.from({length: 5}, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
        blackboardLogs: []
      }]),
      0,
      0,
      0,
      100
    );
  } else {
    // School exists - ensure this user is the principal
    const members = JSON.parse(existingSchool.members || '[]');
    const memberIds = JSON.parse(existingSchool.memberIds || '[]');
    
    // If current principal is an NPC and this user is a member, promote user to principal
    if (existingSchool.principalId.startsWith('npc-') && memberIds.includes(playerId)) {
      // Update school to make this user the principal
      db.prepare(`UPDATE schools SET principalId = ?, principalName = ? WHERE id = ?`)
        .run(playerId, user.real_name, schoolId);
    }
  }
  
  return {
    id: String(user.id),
    name: user.real_name,
    level: 1,
    xp: 0,
    coins: 100, // Start new players with 100 coins
    fatigue: 0,
    backpackSize: 10,
    inventory: [],
    nameChangeCost: 100,
    avatar: user.avatar || 'Avatar001.png',
    schoolId: schoolId,
    schoolName: schoolName,
    cooldownUntil: null,
    lastDailyTreasure: null,
    lastActive: new Date().toISOString(),
    lastLessonAwarded: null,
    stats: {}
  };
}

// Register
app.post('/api/register', async (req, res) => {
  const { real_name, email, password, avatar } = req.body;
  if (!real_name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const avatarToUse = avatar || 'Avatar001.png';
  const hash = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (real_name, email, password_hash, avatar) VALUES (?, ?, ?, ?)');
    const info = stmt.run(real_name, email.toLowerCase(), hash, avatarToUse);
    const user = { id: info.lastInsertRowid, real_name, email: email.toLowerCase(), avatar: avatarToUse };
    res.json(getPlayerFromUser(user));
  } catch (e) {
    res.status(400).json({ error: 'Email already registered' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(getPlayerFromUser(user));
});

// Check if user exists (for deleted player detection)
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const user = db.prepare('SELECT id, real_name, email, avatar FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, real_name: user.real_name, email: user.email, avatar: user.avatar });
});

// Get all schools
app.get('/api/schools', (req, res) => {
  const schools = db.prepare('SELECT * FROM schools').all();
  const parsed = schools.map(s => ({
    ...s,
    memberIds: JSON.parse(s.memberIds || '[]'),
    members: JSON.parse(s.members || '[]'),
    joinRequests: JSON.parse(s.joinRequests || '[]'),
    classes: JSON.parse(s.classes || '[]')
  }));
  res.json(parsed);
});

// Get game state
app.get('/api/gamestate', (req, res) => {
  const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
  if (!state) {
    return res.json({
      activeTags: [],
      globalLogs: [],
      graffiti: [],
      lastTreasureReset: 0,
      easterEggsEnabled: false,
      lessonStart: Date.now()
    });
  }
  res.json({
    activeTags: JSON.parse(state.activeTags || '[]'),
    globalLogs: JSON.parse(state.globalLogs || '[]'),
    graffiti: JSON.parse(state.graffiti || '[]'),
    lastTreasureReset: state.lastTreasureReset || 0,
    easterEggsEnabled: Boolean(state.easterEggsEnabled),
    lessonStart: state.lessonStart || Date.now()
  });
});

// Update schools (batch update)
app.post('/api/schools', (req, res) => {
  const { schools } = req.body;
  if (!Array.isArray(schools)) return res.status(400).json({ error: 'Invalid data' });
  
  const stmt = db.prepare(`UPDATE schools SET 
    name = ?, level = ?, principalId = ?, principalName = ?,
    memberIds = ?, members = ?, joinRequests = ?, classes = ?,
    totalTags = ?, totalCleans = ?, schoolPoints = ?, nameChangeCost = ?
    WHERE id = ?`);
  
  for (const school of schools) {
    stmt.run(
      school.name,
      school.level,
      school.principalId,
      school.principalName,
      JSON.stringify(school.memberIds || []),
      JSON.stringify(school.members || []),
      JSON.stringify(school.joinRequests || []),
      JSON.stringify(school.classes || []),
      school.totalTags || 0,
      school.totalCleans || 0,
      school.schoolPoints || 0,
      school.nameChangeCost || 100,
      school.id
    );
  }
  
  res.json({ success: true });
});

// Update game state
app.post('/api/gamestate', (req, res) => {
  const { activeTags, globalLogs, graffiti, lastTreasureReset, easterEggsEnabled, lessonStart } = req.body;
  
  db.prepare(`UPDATE game_state SET 
    activeTags = ?, globalLogs = ?, graffiti = ?, lastTreasureReset = ?, easterEggsEnabled = ?, lessonStart = ?
    WHERE id = 1`).run(
    JSON.stringify(activeTags || []),
    JSON.stringify(globalLogs || []),
    JSON.stringify(graffiti || []),
    lastTreasureReset || 0,
    easterEggsEnabled ? 1 : 0,
    lessonStart || Date.now()
  );
  
  res.json({ success: true });
});

// Profanity filter function
function filterProfanity(text) {
  const profaneWords = [
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 'bastard', 
    'dick', 'cock', 'pussy', 'cunt', 'piss', 'wank', 'bollocks', 'twat',
    'slut', 'whore', 'fag', 'retard', 'nigger', 'nigga', 'chink', 'spic'
  ];
  
  let filteredText = text;
  
  profaneWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, (match) => {
      // Replace middle characters with asterisks, keeping first and last letter
      if (match.length <= 2) {
        return '*'.repeat(match.length);
      }
      const first = match[0];
      const last = match[match.length - 1];
      const middle = '*'.repeat(match.length - 2);
      return first + middle + last;
    });
  });
  
  return filteredText;
}

// Add graffiti to wall
app.post('/api/graffiti', (req, res) => {
  const { playerName, text } = req.body;
  
  if (!text || text.length > 20) {
    return res.status(400).json({ error: 'Text must be 1-20 characters' });
  }
  
  try {
    // Filter profanity
    const filteredText = filterProfanity(text.trim());
    
    // Get current graffiti
    const gameState = db.prepare('SELECT graffiti FROM game_state WHERE id = 1').get();
    const currentGraffiti = gameState?.graffiti ? JSON.parse(gameState.graffiti) : [];
    
    // Generate random bright color
    const brightColors = [
      '#FF1493', // Deep Pink
      '#00FF00', // Lime
      '#00FFFF', // Cyan
      '#FF00FF', // Magenta
      '#FFD700', // Gold
      '#FF4500', // Orange Red
      '#7FFF00', // Chartreuse
      '#00BFFF', // Deep Sky Blue
      '#FF69B4', // Hot Pink
      '#ADFF2F', // Green Yellow
      '#FF6347', // Tomato
      '#40E0D0', // Turquoise
      '#FF1493', // Deep Pink
      '#00FF7F'  // Spring Green
    ];
    
    // Generate rotation that avoids horizontal (-20 to -5 or 5 to 20)
    const rotation = Math.random() < 0.5 
      ? -20 + (Math.random() * 15)  // -20 to -5
      : 5 + (Math.random() * 15);   // 5 to 20
    
    // Generate random position (with margins to ensure text is visible)
    const newGraffiti = {
      id: `graffiti-${Date.now()}-${Math.random()}`,
      playerName: playerName || 'Anonymous',
      text: filteredText,
      x: 10 + Math.random() * 70, // 10-80% horizontal
      y: 10 + Math.random() * 60, // 10-70% vertical (avoid bottom area)
      rotation: rotation,
      color: brightColors[Math.floor(Math.random() * brightColors.length)],
      timestamp: Date.now()
    };
    
    // Add new graffiti
    const updatedGraffiti = [...currentGraffiti, newGraffiti];
    
    // Save to database
    db.prepare('UPDATE game_state SET graffiti = ? WHERE id = 1').run(
      JSON.stringify(updatedGraffiti)
    );
    
    res.json({ success: true, graffiti: newGraffiti });
  } catch (error) {
    console.error('Error adding graffiti:', error);
    res.status(500).json({ error: 'Failed to add graffiti' });
  }
});

// Delete user (admin endpoint)
app.delete('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  
  try {
    // Delete user from users table
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Note: School cleanup is handled by the frontend before calling this
    res.json({ success: true, message: `User ${userId} deleted` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete school (admin endpoint)
app.delete('/api/school/:id', (req, res) => {
  const schoolId = req.params.id;
  
  try {
    // Delete school from schools table
    const result = db.prepare('DELETE FROM schools WHERE id = ?').run(schoolId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json({ success: true, message: `School ${schoolId} deleted` });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// Add pending reward (when a tag is cleaned by someone else)
app.post('/api/rewards/add', (req, res) => {
  const { playerId, xp, coins, reason } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Missing playerId' });
  }
  
  try {
    db.prepare(`INSERT INTO pending_rewards (playerId, xp, coins, reason, timestamp)
      VALUES (?, ?, ?, ?, ?)`).run(
      playerId,
      xp || 0,
      coins || 0,
      reason || 'Tag reward',
      Date.now()
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding pending reward:', error);
    res.status(500).json({ error: 'Failed to add reward' });
  }
});

// Get and claim pending rewards for a player
app.get('/api/rewards/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  
  try {
    // Get all pending rewards for this player
    const rewards = db.prepare('SELECT * FROM pending_rewards WHERE playerId = ?').all(playerId);
    
    if (rewards.length === 0) {
      return res.json({ xp: 0, coins: 0, count: 0 });
    }
    
    // Sum up all rewards
    const totalXp = rewards.reduce((sum, r) => sum + (r.xp || 0), 0);
    const totalCoins = rewards.reduce((sum, r) => sum + (r.coins || 0), 0);
    
    // Delete claimed rewards
    db.prepare('DELETE FROM pending_rewards WHERE playerId = ?').run(playerId);
    
    res.json({ xp: totalXp, coins: totalCoins, count: rewards.length });
  } catch (error) {
    console.error('Error getting pending rewards:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Change avatar endpoint
app.post('/api/user/:id/avatar', (req, res) => {
  const userId = req.params.id;
  const { avatar } = req.body;
  
  if (!avatar) {
    return res.status(400).json({ error: 'Avatar required' });
  }
  
  try {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    res.json({ success: true, avatar });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Save player game state
app.post('/api/player/:id', (req, res) => {
  const playerId = req.params.id;
  const player = req.body;
  
  try {
    // Upsert (insert or replace) player data
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO players (
        id, name, level, xp, coins, fatigue, fatigueImmunityExpires,
        backpackSize, backpackLevel, inventory, nameChangeCost, avatar,
        schoolId, cooldownUntil, lastDailyTreasure, lastActive, lastLessonAwarded,
        tagsPlaced, tagsCleaned, treasuresFound
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      playerId,
      player.name,
      player.level || 1,
      player.xp || 0,
      player.coins || 0,
      player.fatigue || 0,
      player.fatigueImmunityExpires || 0,
      player.backpackSize || 10,
      player.backpackLevel || 1,
      JSON.stringify(player.inventory || []),
      player.nameChangeCost || 100,
      player.avatar || 'Avatar001.png',
      player.schoolId || null,
      player.cooldownUntil || 0,
      player.lastDailyTreasure || 0,
      Date.now(), // lastActive
      player.lastLessonAwarded || 0,
      player.stats?.tagsPlaced || 0,
      player.stats?.tagsCleaned || 0,
      player.stats?.treasuresFound || 0
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving player:', error);
    res.status(500).json({ error: 'Failed to save player' });
  }
});

// Get player game state
app.get('/api/player/:id', (req, res) => {
  const playerId = req.params.id;
  
  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Transform database row to Player object
    const playerState = {
      id: player.id,
      name: player.name,
      level: player.level,
      xp: player.xp,
      coins: player.coins,
      fatigue: player.fatigue,
      fatigueImmunityExpires: player.fatigueImmunityExpires,
      backpackSize: player.backpackSize,
      backpackLevel: player.backpackLevel,
      inventory: JSON.parse(player.inventory || '[]'),
      nameChangeCost: player.nameChangeCost,
      avatar: player.avatar,
      schoolId: player.schoolId,
      cooldownUntil: player.cooldownUntil,
      lastDailyTreasure: player.lastDailyTreasure,
      lastActive: player.lastActive,
      lastLessonAwarded: player.lastLessonAwarded,
      stats: {
        tagsPlaced: player.tagsPlaced,
        tagsCleaned: player.tagsCleaned,
        treasuresFound: player.treasuresFound
      }
    };
    
    res.json(playerState);
  } catch (error) {
    console.error('Error getting player:', error);
    res.status(500).json({ error: 'Failed to get player' });
  }
});

// Change avatar endpoint (keep for backward compatibility)
app.post('/api/user/:id/avatar', (req, res) => {
  const userId = req.params.id;
  const { avatar } = req.body;
  
  if (!avatar) return res.status(400).json({ error: 'Avatar filename required' });
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Update user avatar
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    
    res.json({ success: true, avatar });
  } catch (error) {
    console.error('Error changing avatar:', error);
    res.status(500).json({ error: 'Failed to change avatar' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

// ============================================
// JANITOR SWEEP - Runs every hour
// ============================================
function performJanitorSweep() {
  try {
    const now = Date.now();
    console.log(`🧹 [${new Date().toISOString()}] Janitor sweep initiated...`);
    
    // Get current game state
    const gameStateRow = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    if (!gameStateRow) {
      console.log('⚠️ No game state found, skipping janitor sweep');
      return;
    }
    
    const activeTags = JSON.parse(gameStateRow.activeTags || '[]');
    const globalLogs = JSON.parse(gameStateRow.globalLogs || '[]');
    
    // Get all schools
    const schoolsRows = db.prepare('SELECT * FROM schools').all();
    const schools = schoolsRows.map(row => ({
      ...row,
      memberIds: JSON.parse(row.memberIds || '[]'),
      members: JSON.parse(row.members || '[]'),
      joinRequests: JSON.parse(row.joinRequests || '[]'),
      classes: JSON.parse(row.classes || '[]')
    }));
    
    // Track cleaned tags and demoted schools
    let cleanedCount = 0;
    const demotedSchools = [];
    const updatedSchools = new Map();
    
    // Filter out matured tags and penalize schools
    const remainingTags = activeTags.filter(tag => {
      const isMatured = tag.isMatured || (now - tag.startTime >= tag.durationMs);
      
      if (isMatured) {
        cleanedCount++;
        
        // Find the school
        const school = schools.find(s => s.id === tag.schoolId);
        if (school) {
          // Get or initialize updated school data
          let updatedSchool = updatedSchools.get(school.id) || { ...school };
          
          // Deduct points equal to the tag's cost
          const pointsLost = tag.totalCost || 20;
          updatedSchool.schoolPoints = (updatedSchool.schoolPoints || 0) - pointsLost;
          
          // Recalculate level
          const oldLevel = updatedSchool.level;
          let newLevel = oldLevel;
          
          // Simple level calculation (you can adjust this based on your getPointsForSchoolLevel function)
          const pointsNeeded = (level) => 100 * level; // Example: Level 2 needs 200 points, Level 3 needs 300, etc.
          
          while (newLevel > 1 && updatedSchool.schoolPoints < pointsNeeded(newLevel)) {
            newLevel--;
          }
          
          updatedSchool.level = newLevel;
          
          // Track demotion
          if (newLevel < oldLevel && !demotedSchools.includes(school.id)) {
            demotedSchools.push(school.id);
            console.log(`📉 ${school.name} demoted from level ${oldLevel} to ${newLevel}`);
          }
          
          // Add blackboard log to all classes
          updatedSchool.classes = updatedSchool.classes.map(cls => {
            if (!cls.blackboardLogs) cls.blackboardLogs = [];
            
            const janitorLog = {
              id: `janitor-${now}-${tag.deskId}`,
              senderName: 'Janitor',
              content: `The Janitor has cleaned Desk ${tag.deskId + 1} with the school losing ${pointsLost} points`,
              timestamp: now
            };
            
            cls.blackboardLogs = [janitorLog, ...cls.blackboardLogs].slice(0, 20);
            return cls;
          });
          
          // Store updated school
          updatedSchools.set(school.id, updatedSchool);
          
          // Add global activity log
          const classroom = school.classes.find(c => c.id === tag.classId);
          if (classroom) {
            const globalLog = {
              id: `janitor-global-${now}-${tag.id}`,
              type: 'CLEAN',
              playerName: 'Janitor',
              playerAvatar: getBrushAvatar(),
              schoolName: school.name,
              content: `Janitor cleaned desk ${tag.deskId + 1} in ${classroom.name} in ${school.name}`,
              timestamp: now
            };
            globalLogs.unshift(globalLog);
          }
        }
        
        return false; // Remove this tag
      }
      
      return true; // Keep this tag
    });
    
    // Add demotion logs
    demotedSchools.forEach(schoolId => {
      const school = schools.find(s => s.id === schoolId);
      if (school) {
        const log = {
          id: `demotion-${now}-${schoolId}`,
          type: 'CLEAN',
          playerName: 'Janitor',
          playerAvatar: getBrushAvatar(),
          schoolName: school.name,
          content: `${school.name} was demoted for a dirty school!`,
          timestamp: now
        };
        globalLogs.unshift(log);
      }
    });
    
    // Save updated schools back to database
    updatedSchools.forEach((school, schoolId) => {
      db.prepare(`
        UPDATE schools 
        SET schoolPoints = ?, level = ?, classes = ?
        WHERE id = ?
      `).run(
        school.schoolPoints,
        school.level,
        JSON.stringify(school.classes),
        schoolId
      );
    });
    
    // Update game state with cleaned tags and logs
    db.prepare(`
      UPDATE game_state 
      SET activeTags = ?, globalLogs = ?
      WHERE id = 1
    `).run(
      JSON.stringify(remainingTags),
      JSON.stringify(globalLogs.slice(0, 50))
    );
    
    console.log(`✅ Janitor sweep complete: ${cleanedCount} tags cleaned, ${demotedSchools.length} schools demoted`);
    
  } catch (error) {
    console.error('❌ Janitor sweep error:', error);
  }
}

// Run janitor sweep every hour (3600000 ms)
setInterval(performJanitorSweep, 3600000);

// Also run on startup (after 10 seconds to allow database initialization)
setTimeout(performJanitorSweep, 10000);

console.log('🧹 Janitor sweep scheduled to run every hour');
