// --- NPC Logic: Tag/Clean ---
// This is a placeholder for NPC actions. In a real game, this would be handled by a backend or game loop.
export function runNpcActions(state: GameState): GameState {
  // For each school, if the principal is an NPC, let them tag a random rival school and clean their own school once per minute.
  // This function should be called periodically (e.g., every minute) by the game loop.
  // Here, we just provide the structure for future expansion.
  return state;
}

import { GameState, Player, School, Tag, ToolType, BlackboardMessage, ActivityLog, SchoolMember } from './types';
import { INSTRUMENTS, CLEANING_TOOLS, TAG_SYMBOLS } from './constants';

const STORAGE_KEY = 'school_vandals_save_v20';

export const CLASS_POOL = [
  "The Classroom", "English Room", "Maths Room", "School Library", 
  "Religious Studies", "Dining Hall", "Bike Shed", "Playground", 
  "First Aid Room", "Science Lab", "Parking Lot", "Art Class",
  "Sports Hall", "Music Room", "Broom Cupboard", "The Graveyard",
  "Technology Room", "Home Baking Tech", "World Travel", "Headmasters Office"
];

const NAMES_POOL = ["Jaxon", "Skye", "Dexter", "Raven", "Finn", "Luna", "Kai", "Sloane", "Milo", "Vesper", "Axel", "Jade", "Zion", "Echo", "Atlas"];
const PRINCIPAL_NAMES = ["Dr. Grimshaw", "Mrs. Trunchbull", "Mr. Sowerberry", "Prof. Snape", "Headmaster Black", "Ms. Hardbroom"];

// Helper function to get a consistent avatar based on NPC ID (deterministic, always the same for a given ID)
function getConsistentAvatarForId(id: string): string {
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
}

const getSystemAvatar = (): string => 'SystemAvatar.png';
const getAnonAvatar = (): string => 'AnonAvatar.png';
const getBrushAvatar = (): string => 'Brush.png';

// Classroom count per school level (1-indexed)
export const CLASSROOMS_PER_LEVEL = [
  0, // dummy for 0-index
  1, // Level 1
  3, // Level 2
  4, // Level 3
  5, // Level 4
  6, // Level 5
  7, // Level 6
  8, // Level 7
  10, // Level 8
  12, // Level 9
  13, // Level 10
  14, // Level 11
  15, // Level 12
  16, // Level 13
  18, // Level 14
  20  // Level 15
];

const generateMockMembers = (count: number, avgLevel: number): SchoolMember[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `npc-mem-${Math.random()}`,
    name: NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)] + "_" + (i + 1),
    level: Math.max(1, Math.floor(avgLevel + (Math.random() * 4 - 2))),
    reputation: Math.floor(Math.random() * 1000),
    avatar: undefined, // Will be assigned consistently based on ID after creation
    lastActive: Date.now() - Math.floor(Math.random() * 1800000) // Active in last 30 mins
  })).map(member => ({
    ...member,
    avatar: getConsistentAvatarForId(member.id)
  }));
};

const generateMockRequests = (): SchoolMember[] => {
    const requests = Array.from({ length: Math.floor(Math.random() * 3) }, (_, i) => ({
        id: `npc-req-${Math.random()}`,
        name: NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)] + "_Req",
        level: 1,
        reputation: 0,
        avatar: undefined,
        lastActive: Date.now()
    }));
    return requests.map(req => ({
        ...req,
        avatar: getConsistentAvatarForId(req.id)
    }));
};

const INITIAL_PLAYER: Player = {
  id: 'player-1',
  name: 'New_Student',
  level: 1, 
  xp: 0,
  coins: 100,
  fatigue: 0,
  backpackSize: 10,
  backpackLevel: 1,
  inventory: [], 
  nameChangeCost: 10,
  schoolId: null, // Forces setup
  cooldownUntil: 0,
  lastDailyTreasure: 0,
  lastActive: Date.now(),
  lastLessonAwarded: Math.floor(Date.now() / 3600000),
  stats: {
    tagsPlaced: 0,
    tagsCleaned: 0,
    treasuresFound: 0
  }
};

export const generateSchool = (id: string, name: string, level: number, isPlayerSchool: boolean = false): School => {
  const roomCount = Math.min(CLASSROOMS_PER_LEVEL[level] || 1, CLASS_POOL.length);
  const classes = CLASS_POOL.slice(0, roomCount).map((className, i) => ({
    id: i + 1,
    name: className,
    desks: Array.from({ length: 5 }, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
    blackboardLogs: []
  }));
  
  // Calculate points based on level - give them points at their level threshold plus some random extra
  const basePoints = getPointsForSchoolLevel(level);
  const nextLevelPoints = getPointsForSchoolLevel(level + 1);
  const pointsRange = nextLevelPoints - basePoints;
  const schoolPoints = basePoints + Math.floor(Math.random() * pointsRange * 0.5); // 0-50% progress to next level

  return {
    id,
    name,
    level,
    principalId: isPlayerSchool ? 'player-1' : 'npc-p-' + id,
    principalName: isPlayerSchool ? INITIAL_PLAYER.name : PRINCIPAL_NAMES[Math.floor(Math.random() * PRINCIPAL_NAMES.length)],
    memberIds: isPlayerSchool ? ['player-1'] : ['npc-p-' + id],
    members: isPlayerSchool
      ? [{
          id: 'player-1',
          name: INITIAL_PLAYER.name,
          level: INITIAL_PLAYER.level,
          reputation: INITIAL_PLAYER.xp,
          lastActive: INITIAL_PLAYER.lastActive
        }]
      : generateMockMembers(Math.floor(Math.random() * 15) + 5, level),
    joinRequests: isPlayerSchool ? [] : [],
    classes,
    totalTags: Math.floor(Math.random() * 100) + 10,
    totalCleans: Math.floor(Math.random() * 40) + 5,
    schoolPoints,
    nameChangeCost: 100
  };
};

// Helper to get the level a school should be based on classroom count
export function getLevelForClassroomCount(classroomCount: number): number {
  // Inverse of: classrooms = 1 + floor((level - 1) * 19 / 14)
  // Level 1 = 1 room, Level 15 = 20 rooms
  if (classroomCount <= 1) return 1;
  if (classroomCount >= 20) return 15;
  // Solve: classrooms = 1 + floor((level - 1) * 19 / 14)
  // level = 1 + ceil((classrooms - 1) * 14 / 19)
  return Math.min(15, 1 + Math.ceil((classroomCount - 1) * 14 / 19));
}

// XP and points functions - defined early to avoid hoisting issues
export function getXpForLevel(level: number) {
  if (level <= 1) return 0;
  // Reduced for testing - Level 2 = 50 XP, Level 3 = 140 XP, etc.
  return Math.floor(50 * Math.pow(level - 1, 1.5));
}

export function getPointsForSchoolLevel(level: number) {
  if (level <= 1) return 0;
  // School leveling: Level 2 = 500, Level 3 = 1400, Level 4 = 2600, etc.
  return Math.floor(500 * Math.pow(level - 1, 1.5));
}

export function getLevelForSchoolPoints(points: number): number {
  // Calculate what level a school should be based on their points
  let level = 1;
  while (getPointsForSchoolLevel(level + 1) <= points) {
    level++;
    if (level >= 20) break; // Cap at level 20
  }
  return level;
}

// Utility to generate a random school name
function randomSchoolName() {
  const adjectives = ["Crimson", "Silver", "Golden", "Emerald", "Shadow", "Bright", "Iron", "Frost", "Thunder", "Maple", "Cedar", "Willow", "Falcon", "Wolf", "Phoenix"];
  const nouns = ["Academy", "School", "Institute", "College", "Prep", "Hall", "Lyceum", "House", "Heights", "Valley", "Grove", "Park", "Ridge", "Point", "Field"];
  return `${adjectives[Math.floor(Math.random()*adjectives.length)]} ${nouns[Math.floor(Math.random()*nouns.length)]}`;
}

// Generate 5 new level 1 schools, each with a unique NPC head
function generateInitialSchools() {
  return Array.from({length: 5}, (_, i) => {
    const schoolId = `school-${i+1}`;
    const npcId = `npc-head-${i+1}`;
    const npcName = PRINCIPAL_NAMES[Math.floor(Math.random()*PRINCIPAL_NAMES.length)] + `_${i+1}`;
    return {
      id: schoolId,
      name: randomSchoolName(),
      level: 1,
      principalId: npcId,
      principalName: npcName,
      memberIds: [npcId],
      members: [{
        id: npcId,
        name: npcName,
        level: 1,
        reputation: 0,
        avatar: getConsistentAvatarForId(npcId),
        lastActive: Date.now()
      }],
      joinRequests: [],
      classes: CLASS_POOL.slice(0, 1).map((className, idx) => ({
        id: idx+1,
        name: className,
        desks: Array.from({length: 5}, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
        blackboardLogs: []
      })),
      totalTags: 0,
      totalCleans: 0,
      schoolPoints: 0
    };
  });
}

const MOCK_SCHOOLS: School[] = generateInitialSchools();

class GameDatabase {
  private state: GameState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): GameState {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.player && parsed.schools && parsed.activeTags) {
          // Migration check
          if (parsed.player.nameChangeCost === undefined) parsed.player.nameChangeCost = 10;
          if (parsed.lastTreasureReset === undefined) parsed.lastTreasureReset = 0;
          if (parsed.easterEggsEnabled === undefined) parsed.easterEggsEnabled = false; // Migration: ensure easter eggs setting exists
          if (parsed.lessonStart === undefined) parsed.lessonStart = Date.now(); // Migration: ensure lesson start time exists
          if (!Array.isArray(parsed.globalLogs)) parsed.globalLogs = []; // Migration: ensure global logs exist
          if (!Array.isArray(parsed.graffiti)) parsed.graffiti = []; // Migration: ensure graffiti array exists
          
          // CRITICAL: Ensure player progression data is never lost or reset to 0
          // Use nullish coalescing to preserve 0 values while catching undefined/null
          if (parsed.player.level === undefined || parsed.player.level === null) parsed.player.level = 1;
          if (parsed.player.xp === undefined || parsed.player.xp === null) parsed.player.xp = 0;
          if (parsed.player.coins === undefined || parsed.player.coins === null) parsed.player.coins = 0;
          if (parsed.player.backpackLevel === undefined || parsed.player.backpackLevel === null) parsed.player.backpackLevel = 1;
          if (parsed.player.backpackSize === undefined || parsed.player.backpackSize === null) parsed.player.backpackSize = 10;
          if (!Array.isArray(parsed.player.inventory)) parsed.player.inventory = [];
          
          // Migration: Ensure stats field exists - PRESERVE existing values!
          if (!parsed.player.stats) {
            parsed.player.stats = {
              tagsPlaced: 0,
              tagsCleaned: 0,
              treasuresFound: 0
            };
          } else {
            // Ensure all stat fields exist - but PRESERVE any existing non-zero values
            if (typeof parsed.player.stats.tagsPlaced !== 'number') parsed.player.stats.tagsPlaced = 0;
            if (typeof parsed.player.stats.tagsCleaned !== 'number') parsed.player.stats.tagsCleaned = 0;
            if (typeof parsed.player.stats.treasuresFound !== 'number') parsed.player.stats.treasuresFound = 0;
          }
          
          // IMPORTANT: Log loaded player data for debugging
          console.log('=== DATABASE LOAD ===');
          console.log('Player ID:', parsed.player.id);
          console.log('Player Level:', parsed.player.level);
          console.log('Player XP:', parsed.player.xp);
          console.log('Player Coins:', parsed.player.coins);
          console.log('Player Stats:', parsed.player.stats);
          console.log('====================');
          
          // Migration: Recalculate school levels based on their points and correct classroom count using CLASSROOMS_PER_LEVEL
          const CLASSROOMS_PER_LEVEL = [
            0, // dummy for 0-index
            1, // Level 1
            3, // Level 2
            4, // Level 3
            5, // Level 4
            6, // Level 5
            7, // Level 6
            8, // Level 7
            10, // Level 8
            12, // Level 9
            13, // Level 10
            14, // Level 11
            15, // Level 12
            16, // Level 13
            18, // Level 14
            20  // Level 15
          ];
          parsed.schools = parsed.schools.map((school: any) => {
            const level = getLevelForSchoolPoints(school.schoolPoints || 0);
            const roomCount = Math.min(CLASSROOMS_PER_LEVEL[level] || 1, CLASS_POOL.length);
            const classes = CLASS_POOL.slice(0, roomCount).map((className, i) => {
              // Try to preserve existing desk/blackboard state if possible
              const existing = school.classes && school.classes[i];
              return existing ? { ...existing, name: className } : {
                id: i + 1,
                name: className,
                desks: Array.from({ length: 5 }, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
                blackboardLogs: []
              };
            });
            return {
              ...school,
              level,
              classes
            };
          });
          
          return parsed;
        }
      } catch (e) {
        console.error("Persistence failure, resetting state.", e);
      }
    }

    return {
      player: INITIAL_PLAYER,
      schools: generateInitialSchools(),
      activeTags: [],
      globalLogs: [],
      graffiti: [],
      lastTreasureReset: 0,
      easterEggsEnabled: false,
      lessonStart: Date.now()
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public save(state: GameState) {
    this.state = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

const db = new GameDatabase();

export function loadGame(): GameState {
  return db.getState();
}

export function saveGame(state: GameState) {
  db.save(state);
}
