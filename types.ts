
export enum ToolType {
  TAG = 'TAG',
  CLEAN = 'CLEAN'
}

export interface Tool {
  id: string;
  name: string;
  levelRequired: number;
  type: ToolType;
  power: number; 
  maturationMs?: number; 
  cost: number; 
}

export interface Tag {
  id: string;
  toolId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  startTime: number;
  durationMs: number;
  schoolId: string;
  classId: number;
  deskId: number;
  hardness: number;
  symbol: number;
  totalCost: number;
  isMatured?: boolean;
}

export interface BlackboardMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: number;
}

export interface ActivityLog {
  id: string;
  type: 'TAG' | 'CLEAN' | 'FIND';
  playerName: string;
  playerAvatar?: string;
  schoolName: string;
  content: string;
  timestamp: number;
}

export interface Graffiti {
  id: string;
  playerName: string;
  text: string;
  x: number; // Position percentage (0-100)
  y: number; // Position percentage (0-100)
  rotation: number; // Degrees (-15 to 15)
  color: string; // Random bright color
  timestamp: number;
}

export interface SchoolMember {
  id: string;
  name: string;
  level: number;
  reputation: number;
  lastActive: number;
  avatar?: string;
  stats?: {
    tagsPlaced: number;
    tagsCleaned: number;
    treasuresFound: number;
  };
}

export interface School {
    classes: Class[];
    totalTags: number;
    totalCleans: number;
    schoolPoints: number; 
  id: string;
  name: string;
  level: number;
  principalId: string;
  principalName: string; 
  deputyId?: string;
  memberIds: string[];
  members?: SchoolMember[];
  joinRequests?: SchoolMember[]; // Pending requests
  nameChangeCost?: number; // Cost to change school name (doubles each time)
}

export interface Player {
  id: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  fatigue: number; 
  fatigueImmunityExpires?: number; // New field for chocolate bar effect
  backpackSize: number;
  backpackLevel: number; // 1 = Small (10), 2 = Medium (20), 3 = Large (30), 4 = Hiking (50), 5 = Nike (100)
  inventory: string[]; 
  nameChangeCost: number; // Cost to change name
  avatar?: string; // Avatar filename (e.g., "Avatar001.png")
  schoolId: string | null; // Null indicates no school (needs setup)
  cooldownUntil: number; 
  lastDailyTreasure: number;
  lastActive: number; 
  lastLessonAwarded: number; 
  stats: {
    tagsPlaced: number;
    tagsCleaned: number;
    treasuresFound: number;
  };
}

export interface GameState {
  player: Player;
  schools: School[];
  activeTags: Tag[];
  globalLogs: ActivityLog[];
  graffiti: Graffiti[]; // Wall graffiti visible to all players
  lastTreasureReset: number; // Timestamp of last treasure reset
  easterEggsEnabled?: boolean; // Admin toggle for Easter egg treasures
  lessonStart?: number; // Global lesson timer start time (shared across all players)
}
