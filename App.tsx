import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadGame, saveGame, getXpForLevel, getPointsForSchoolLevel, CLASSROOMS_PER_LEVEL, CLASS_POOL } from './store';
import { TREASURE_TYPES, DESK_COOLDOWN_MS, ITEM_DEFINITIONS, TREASURE_INTERVAL_MS } from './constants';
import { INSTRUMENTS, TAG_SYMBOLS_LIST, getWeaponImagePath, CLEANING_TOOLS, BACKPACK_LEVELS } from './constants';
import { HashRouter, Link, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import GameRulesPage from './GameRulesPage';
import { Edit2 } from 'lucide-react';
import PlayerList from './PlayerList';
import RivalSchoolsMapBg from './RivalSchoolsMapBg';
import { GameState, School, Classroom } from './types';

// Helper function to add classrooms when a school levels up
const addClassroomsForLevel = (school: School, newLevel: number): School => {
  const requiredRooms = Math.min(CLASSROOMS_PER_LEVEL[newLevel] || 1, CLASS_POOL.length);
  const currentRooms = school.classes?.length || 0;
  
  if (requiredRooms <= currentRooms) {
    return school; // Already has enough classrooms
  }
  
  // Add new classrooms
  const newClassrooms: Classroom[] = [];
  for (let i = currentRooms; i < requiredRooms; i++) {
    newClassrooms.push({
      id: i + 1,
      name: CLASS_POOL[i],
      desks: Array.from({ length: 5 }, (_, d) => ({ id: d, lastSearched: 0, hasTreasure: false })),
      blackboardLogs: []
    });
  }
  
  return {
    ...school,
    classes: [...(school.classes || []), ...newClassrooms]
  };
};
import { Home } from 'lucide-react';
import { MapIcon } from 'lucide-react';
import { Blocks } from 'lucide-react';
import { Backpack } from 'lucide-react';
import { ShoppingBag } from 'lucide-react';
import { Cog } from 'lucide-react';
import sha256 from 'crypto-js/sha256';
import encHex from 'crypto-js/enc-hex';
import { Coins } from 'lucide-react';
import { Clock } from 'lucide-react';
import { School as SchoolIcon } from 'lucide-react';
import { Sword } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Users } from 'lucide-react';
import { DoorOpen } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Palette, FlaskConical, Calculator, Music, Utensils, Globe, Ghost, Cpu, BookOpen } from 'lucide-react';
import { ChevronLeft, ChevronRight, ArrowLeftCircle, Shield, ChevronUp, ChevronDown, X } from 'lucide-react';

// Top-level error boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: any, errorInfo: any) {
        // You can log errorInfo if needed
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ background: '#fff', color: '#b91c1c', padding: 40, fontFamily: 'monospace', minHeight: '100vh' }}>
                    <h1>App Error</h1>
                    <pre>{String(this.state.error)}</pre>
                </div>
            );
        }
        return this.props.children;
        }
}

const getCleanerImagePath = (toolName: string): string => {
    // Map cleaner tool names to cleaner PNG filenames
    const cleanerMap: Record<string, string> = {
        'Finger': 'Finger.png',
        'Sponge': 'Sponge.png',
        'Blackboard Rubber': 'BlackboardRubber.png',
        'Antibac Spray': 'AntiBacSpray.png',
        'Scouring Pad': 'ScouringPad.png',
        'Bleach': 'Bleach.png',
        'Mr 6 Pack Cleaner': 'Mr6PackCleaner.png',
        'Cillit Boom': 'CillitBoom.png',
        'Pressure Washer': 'PressureWasher.png',
        'Meths': 'Meths.png',
        'Paint Stripper Gun': 'PaintStripperGun.png',
    'Stripping Machine': 'StrippingMachine.png',
    'Dynomite': 'Dynomite.png',
    'Toxic Acid': 'ToxicAcid.png',
    'Magic Wand': 'MagicWand.png',
  };
  
  const filename = cleanerMap[toolName];
  return filename ? `/assets/cleaners/${filename}` : '';
};

const getTagImagePath = (levelRequired: number): string => {
  // Map tag levels (1-20) to tag PNG filenames
  if (levelRequired < 1 || levelRequired > 20) return '';
  return `/assets/tags/Tag${levelRequired}.png`;
};

const getClassroomBackgroundPath = (classIndex: number): string => {
  // Map classroom index to level (1-20), cycle if more than 20
  const level = ((classIndex % 20) + 1);
  return `/assets/classrooms/Classroom${level}.png`;
};

const getSchoolBackgroundPath = (schoolLevel: number): string => {
  // Clamp level between 1-15, schools above 15 use level 15 graphic
  const level = Math.min(15, Math.max(1, schoolLevel));
  const paddedLevel = level.toString().padStart(2, '0');
  return `/assets/schools/${paddedLevel}.png`;
};

const getSchoolCleanliness = (school: School, activeTags: Tag[]): number => {
  const totalDesks = school.classes.length * 5;
  const tagCount = activeTags.filter(t => t.schoolId === school.id).length;
  return Math.round(((totalDesks - tagCount) / totalDesks) * 100);
};

const getSchoolTypeName = (level: number): string => {
  if (level >= 15) return 'Grand University';
  if (level >= 12) return 'University';
  if (level >= 9) return 'College';
  if (level >= 6) return 'High School';
  if (level >= 3) return 'Middle School';
  return 'Elementary School';
};

const getConsistentAvatarForId = (id: string): string => {
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

const getSystemAvatar = (): string => 'SystemAvatar.png';
const getAnonAvatar = (): string => 'AnonAvatar.png';
const getBrushAvatar = (): string => 'Brush.png';

const formatMaturation = (ms: number) => {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const formatFatigueTime = (fatigue: number) => {
  if (fatigue <= 0) return "00:00:00";
  const totalSeconds = Math.ceil(fatigue / 0.7); // 0.7 is the tick rate in the interval
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatCountdownTime = (milliseconds: number) => {
  if (milliseconds <= 0) return "00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatFatigueReduction = (seconds: number) => {
  if (seconds <= 0) return "0 seconds";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (secs > 0) parts.push(`${secs} second${secs > 1 ? 's' : ''}`);
  
  return parts.join(' ');
};

// Helper to update school points and check for level up
const updateSchoolPointsWithLevelUp = (
    school: School,
    pointsToAdd: number,
    playerId: string | null,
    setShowSchoolLevelUp: (value: { schoolName: string, level: number } | null) => void
): { school: School, leveledUp: boolean, newLevel: number } => {
    const oldLevel = school.level;
    const newPoints = school.schoolPoints + pointsToAdd;
    const pointsNeededForNextLevel = getPointsForSchoolLevel(oldLevel + 1);
    const shouldLevelUp = newPoints >= pointsNeededForNextLevel;
    const newLevel = shouldLevelUp ? oldLevel + 1 : oldLevel;
    
    let updatedSchool = { 
        ...school, 
        schoolPoints: newPoints,
        level: newLevel
    };
    
    // Add new classrooms if leveled up
    if (shouldLevelUp) {
        updatedSchool = addClassroomsForLevel(updatedSchool, newLevel);
        // Show level up modal for player's school
        if (playerId && school.memberIds.includes(playerId)) {
            setShowSchoolLevelUp({ schoolName: school.name, level: newLevel });
        }
    }
    
    return { school: updatedSchool, leveledUp: shouldLevelUp, newLevel };
};

const calculateSpecificFatigue = (cleanerLevel: number, tag: Tag | undefined) => {
    const baseSeconds = 60;
    let tagLevel = 1;
    if (tag) {
        const tagTool = INSTRUMENTS.find(i => i.id === tag.toolId);
        tagLevel = tagTool?.levelRequired || 1;
    }
    if (cleanerLevel > tagLevel) return 0;
    const diff = tagLevel - cleanerLevel; 
    const seconds = baseSeconds * Math.pow(2, diff);
    return Math.ceil(seconds * 0.7); 
};

// Map classroom names to themes for the UI cards
const getClassThemeUI = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('art')) return { icon: <Palette size={24} className="text-pink-600" />, bg: 'bg-pink-50', accent: 'text-pink-600', border: 'border-pink-200' };
  if (n.includes('science') || n.includes('chem')) return { icon: <FlaskConical size={24} className="text-emerald-600" />, bg: 'bg-emerald-50', accent: 'text-emerald-600', border: 'border-emerald-200' };
  if (n.includes('math')) return { icon: <Calculator size={24} className="text-blue-600" />, bg: 'bg-blue-50', accent: 'text-blue-600', border: 'border-blue-200' };
  if (n.includes('music')) return { icon: <Music size={24} className="text-amber-600" />, bg: 'bg-amber-50', accent: 'text-amber-600', border: 'border-amber-200' };
  if (n.includes('food') || n.includes('dining')) return { icon: <Utensils size={24} className="text-orange-600" />, bg: 'bg-orange-50', accent: 'text-orange-600', border: 'border-orange-200' };
  if (n.includes('geography')) return { icon: <Globe size={24} className="text-cyan-600" />, bg: 'bg-cyan-50', accent: 'text-cyan-600', border: 'border-cyan-200' };
  if (n.includes('grave')) return { icon: <Ghost size={24} className="text-purple-600" />, bg: 'bg-purple-100', accent: 'text-purple-600', border: 'border-purple-200' };
  if (n.includes('tech')) return { icon: <Cpu size={24} className="text-indigo-600" />, bg: 'bg-indigo-50', accent: 'text-indigo-600', border: 'border-indigo-200' };
  return { icon: <BookOpen size={24} className="text-slate-600" />, bg: 'bg-slate-50', accent: 'text-slate-600', border: 'border-slate-200' };
};

// --- Components ---

// Dashboard Component
const Dashboard: React.FC<{ state: GameState, onNavigate: (path: string) => void, isUnderAttack: boolean, onEditName: () => void }> = ({ state, onNavigate, isUnderAttack, onEditName }) => {
    const playerSchool = state.schools.find(s => s.id === state.player.schoolId);
    const recentLogs = state.globalLogs.slice(0, 50);
    
    const playerStats = {
        tagsPlaced: state.player?.stats?.tagsPlaced ?? 0,
        tagsCleaned: state.player?.stats?.tagsCleaned ?? 0,
        treasuresFound: state.player?.stats?.treasuresFound ?? 0
    };
    
    let dirtyPercent = 0;
    if (playerSchool) {
        const totalDesks = playerSchool.classes.reduce((sum, c) => sum + (c.desks?.length || 0), 0);
        const taggedDesks = state.activeTags.filter(t => t.schoolId === playerSchool.id).length;
        dirtyPercent = totalDesks > 0 ? Math.round((taggedDesks / totalDesks) * 100) : 0;
    }
    
    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 auto-rows-fr gap-2 flex-1 h-full">
                {/* 1. Home School & Stats */}
                <Link to={`/school/${playerSchool?.id || ''}`} className="group relative h-full rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(59,130,246,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative px-4 py-3 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <svg className="w-7 h-7 text-blue-900" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
                                </div>
                                <div className="flex-1">
                                    <div className="text-3xl font-black text-white drop-shadow-lg leading-tight flex items-center gap-3">
                                        <span>{playerSchool?.name || 'No School'}</span>
                                        <span className="text-3xl font-black drop-shadow-lg" style={{ color: `rgb(${Math.round(255 * (dirtyPercent / 100))}, ${Math.round(255 * ((100 - dirtyPercent) / 100))}, 0)` }}>
                                            {100 - dirtyPercent}%
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-blue-100 mt-1 flex items-center gap-3">
                                        <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Level {playerSchool?.level || 1}</span>
                                        <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">{playerSchool?.memberIds.length || 0} Students</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-blue-100 mb-2">
                                        <span>School Progress</span>
                                        <span>{playerSchool?.schoolPoints || 0} / {getPointsForSchoolLevel((playerSchool?.level || 1) + 1)} pts</span>
                                    </div>
                                    <div className="w-full h-3 bg-blue-900/50 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
                                        <div className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-lg transition-all duration-500" style={{ width: `${Math.min(100, ((playerSchool?.schoolPoints || 0) / getPointsForSchoolLevel((playerSchool?.level || 1) + 1)) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-blue-900 font-black rounded-2xl shadow-[0_10px_30px_-5px_rgba(251,191,36,0.5)] group-hover:shadow-[0_15px_40px_-5px_rgba(251,191,36,0.7)] text-xl group-hover:scale-105 transition-all duration-300 border-2 border-yellow-300 text-center">
                            View Your School
                        </div>
                    </div>
                </Link>

                {/* 2. Attack Rivals */}
                <Link to="/explore" className="group relative h-full rounded-3xl bg-gradient-to-br from-red-600 via-rose-700 to-orange-900 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(239,68,68,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative px-4 py-3 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg rotate-12">
                                    <svg className="w-7 h-7 text-red-900 -rotate-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/></svg>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-white drop-shadow-lg leading-tight">Attack Rivals</div>
                                    <div className="text-sm font-bold text-red-100 mt-1">Vandalize & Dominate</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                    <p className="text-base text-red-50 leading-relaxed">Tag desks in rival schools to earn points and glory! The more you vandalize, the stronger your reputation becomes.</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white font-black rounded-2xl shadow-[0_10px_30px_-5px_rgba(239,68,68,0.5)] group-hover:shadow-[0_15px_40px_-5px_rgba(239,68,68,0.7)] text-xl group-hover:scale-105 transition-all duration-300 border-2 border-red-400 text-center">
                            Explore Rivals
                        </div>
                    </div>
                </Link>

                {/* 3. Recent Activity */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900 shadow-[0_20px_60px_-15px_rgba(71,85,105,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(71,85,105,0.7)] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative px-4 py-3 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-7 h-7 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                            </div>
                            <div className="text-3xl font-black text-white drop-shadow-lg">Recent Activity</div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/40 rounded-2xl p-4 backdrop-blur-sm border border-slate-600/30">
                            {recentLogs.length === 0 && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                                        </div>
                                        <div className="text-slate-400 font-bold">No recent activity...</div>
                                        <div className="text-slate-500 text-sm mt-1">Start playing to see updates!</div>
                                    </div>
                                </div>
                            )}
                            <ul className="space-y-1.5">
                                {recentLogs.map(log => (
                                    <li key={log.id} className="bg-gradient-to-r from-slate-800/80 to-blue-900/40 rounded-lg px-3 py-2 flex flex-col border-l-4 border-blue-400 shadow-lg backdrop-blur-sm hover:from-slate-800 hover:to-blue-900/60 transition-all">
                                        <div className="flex items-start justify-between gap-2 mb-0.5">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                {log.playerAvatar && (
                                                    <img 
                                                        src={`/assets/Avatars/${log.playerAvatar}`} 
                                                        alt={log.playerName}
                                                        className="w-6 h-6 rounded-full flex-shrink-0 border border-blue-300 shadow-md"
                                                    />
                                                )}
                                                <span className="font-bold text-yellow-300 text-xs uppercase tracking-wide truncate">{log.playerName}</span>
                                            </div>
                                            <span className="text-[10px] text-blue-200 bg-blue-900/40 px-1.5 py-0.5 rounded-full flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-slate-100 text-xs leading-tight">{log.content}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 4. Player Stats */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-900 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(16,185,129,0.7)] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative px-4 py-3 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white font-black text-3xl border-4 border-blue-300 shadow-xl hover:rotate-6 transition-transform">
                                    {state.player.level}
                                </div>
                                {/* Player Avatar */}
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-xl hover:scale-110 transition-transform">
                                    <img 
                                        src={`/assets/Avatars/${state.player.avatar || 'Avatar001.png'}`} 
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-white uppercase leading-none text-2xl flex items-center gap-2 drop-shadow-lg">
                                        {state.player.name}
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-emerald-100 mb-1">
                                            <span>Level Progress</span>
                                            <span>{state.player.xp} / {getXpForLevel(state.player.level + 1)} XP</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-emerald-900/50 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
                                            <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 shadow-lg transition-all duration-500" style={{ width: `${Math.min(100, (state.player.xp / getXpForLevel(state.player.level + 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                                    <div className="text-xs text-emerald-100 font-bold uppercase mb-1">Coins</div>
                                    <div className="font-black text-yellow-300 text-2xl flex items-center gap-2">
                                        <Coins size={20}/>
                                        {state.player.coins}
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                                    <div className="text-xs text-emerald-100 font-bold uppercase mb-1">Fatigue</div>
                                    <div className={`font-black text-2xl ${state.player.fatigue > 0 ? 'text-orange-300 animate-pulse' : 'text-emerald-300'}`}>
                                        {formatFatigueTime(state.player.fatigue)}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-sm rounded-xl p-3 border border-purple-400/30 hover:from-purple-600/40 hover:to-purple-800/40 transition-colors">
                                    <div className="text-xs text-purple-200 font-bold uppercase mb-1">Tags Placed</div>
                                    <div className="font-black text-white text-xl">
                                        {playerStats.tagsPlaced}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-sm rounded-xl p-3 border border-green-400/30 hover:from-green-600/40 hover:to-green-800/40 transition-colors">
                                    <div className="text-xs text-green-200 font-bold uppercase mb-1">Tags Cleaned</div>
                                    <div className="font-black text-white text-xl">
                                        {playerStats.tagsCleaned}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-600/30 to-amber-800/30 backdrop-blur-sm rounded-xl p-3 border border-amber-400/30 hover:from-amber-600/40 hover:to-amber-800/40 transition-colors">
                                    <div className="text-xs text-amber-200 font-bold uppercase mb-1">Treasures Found</div>
                                    <div className="font-black text-white text-xl">
                                        {playerStats.treasuresFound}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartoonClassroomBg: React.FC<{ roomName: string, classIndex?: number }> = ({ roomName, classIndex = 0 }) => {
    const [showImage, setShowImage] = useState(true);
    const backgroundPath = getClassroomBackgroundPath(classIndex);

    return (
    <div className="absolute top-[100px] bottom-0 right-0 w-7/10 pointer-events-none z-0 overflow-hidden">
        {/* Dark blue background behind classroom image and blackboard */}
        <div className="absolute inset-0 w-full h-full bg-blue-900" style={{ zIndex: 0 }}></div>
        {/* Custom Classroom Background Image */}
        {showImage && (
            <img 
                src={backgroundPath}
                alt="Classroom Background"
                className="w-full h-full object-contain"
                onError={() => setShowImage(false)}
                onLoad={() => setShowImage(true)}
                style={{ zIndex: 1, position: 'relative' }}
            />
        )}
        {/* Fallback to procedural background if image fails */}
        {!showImage && (
            <div className="w-full h-full bg-gradient-to-b from-slate-400 via-slate-300 to-amber-700" style={{ zIndex: 1, position: 'relative' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
            </div>
        )}
        {/* Lighting Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#ca8a04]/10 pointer-events-none" style={{ zIndex: 2 }}></div>
    </div>
    );
};

const SchoolBackgroundGraphic: React.FC<{ level: number, schoolName?: string, studentCount?: number }> = ({ level, schoolName, studentCount }) => {
    const [showImage, setShowImage] = useState(true);
    const backgroundPath = getSchoolBackgroundPath(level);
    
    // Debug logging
    console.log('SchoolBackgroundGraphic - Level:', level, 'Path:', backgroundPath);

    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Custom School Background Image */}
            {showImage && (
                <img 
                    key={backgroundPath}
                    src={backgroundPath}
                    alt="School Background"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        console.error('School image failed to load:', backgroundPath, e);
                        setShowImage(false);
                    }}
                />
            )}
            
            {/* Fallback to gradient if image fails */}
            {!showImage && (
                <div className="w-full h-full bg-gradient-to-b from-sky-300 via-sky-200 to-green-400">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>
                </div>
            )}
            
            {/* Lighting Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-green-600/10 pointer-events-none"></div>
            
            {/* School Name & Stats Overlay - Positioned in yellow banner (drawn last) */}
            {schoolName && (
                <div className="absolute top-[2%] left-[12%] right-[12%] flex flex-col items-center justify-center pointer-events-none z-10 gap-1">
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-widest text-center px-4 leading-tight drop-shadow-lg">
                        {schoolName}
                    </h1>
                    <div className="flex gap-12 items-baseline justify-center">
                        <div className="text-xl font-black text-slate-900 drop-shadow-md">
                            Level <span className="text-2xl">{level}</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 drop-shadow-md">
                            Students <span className="text-2xl">{studentCount || 0}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TagProgressPie: React.FC<{ progress: number, timeRemaining?: number, tag?: Tag }> = ({ progress, timeRemaining, tag }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Ready!';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };
  
  const handleMouseEnter = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setShowDetails(true);
    const timeout = setTimeout(() => setShowDetails(false), 3000);
    setHideTimeout(timeout);
  };
  
  const handleMouseLeave = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setShowDetails(false);
  };
  
  const weapon = tag ? INSTRUMENTS.find(i => i.id === tag.toolId) : null;
  
  return (
    <>
      <div 
        className="relative w-12 h-12 rounded-full shadow-lg bg-white border-4 border-white flex items-center justify-center overflow-visible cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
          {/* Filled Pie using Conic Gradient - solid circle */}
          <div 
              className="w-full h-full rounded-full overflow-hidden"
              style={{ 
                  background: `conic-gradient(#3b82f6 ${progress * 100}%, #e2e8f0 0)` 
              }}
          />
      </div>
      {/* Enhanced Tooltip rendered outside to avoid overflow issues */}
      {showDetails && weapon && (
        <div 
          className="fixed bg-gradient-to-br from-slate-800 to-slate-900 text-white px-3 py-2 rounded-xl shadow-2xl border-2 border-blue-400 min-w-[140px] pointer-events-none"
          style={{ 
            zIndex: 9999,
            position: 'fixed',
            top: 'calc(50% - 200px)',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {tag && tag.creatorName && (
            <div className="text-[10px] font-bold text-yellow-300 mb-1">
              👤 {tag.creatorName}
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <img src={`/assets/weapons/${weapon.id}.png`} alt={weapon.name} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="text-[11px] font-bold text-blue-300">{weapon.name}</div>
          </div>
          <div className="text-[10px] font-bold text-white">{Math.floor(progress * 100)}% Complete</div>
          {timeRemaining !== undefined && <div className="text-[9px] text-blue-200 font-semibold mt-0.5">⏱ {formatTimeRemaining(timeRemaining)}</div>}
        </div>
      )}
    </>
  );
};

const formatLessonTime = (ms: number) => {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        return `${min}:${sec.toString().padStart(2, '0')}`;
};

const GlobalLessonTimer: React.FC<{
        player: Player,
        lessonTime: number,
        lessonNumber: number,
        rewardAvailable: boolean,
        rewardCollected: boolean,
        onCollectReward: () => void,
        rewardTimeout: number
}> = ({ player, lessonTime, lessonNumber, rewardAvailable, rewardCollected, onCollectReward, rewardTimeout }) => {
        return (
            <div className="bg-white px-3 py-1 rounded-full border-2 border-slate-200 flex items-center gap-2 text-slate-500 font-bold text-xs shadow-sm select-none">
                <Clock size={14} />
                {rewardAvailable ? (
                    <button
                        className="bg-emerald-500 text-white px-3 py-1 rounded-full font-bold text-xs ml-2 hover:bg-emerald-600 transition-colors"
                        onClick={onCollectReward}
                        disabled={rewardCollected}
                    >
                        {rewardCollected ? 'Collected!' : `Reward (${formatLessonTime(rewardTimeout)})`}
                    </button>
                ) : (
                    <span>Lesson {lessonNumber} of 5: {formatLessonTime(lessonTime)}</span>
                )}
            </div>
        );
};

const Blackboard: React.FC<{ logs: BlackboardMessage[] }> = ({ logs }) => {
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };
    
        return (
            <div className="fixed left-0 top-[100px] bottom-0 w-64 bg-[#222] border-[8px] border-[#5d4037] shadow-2xl z-40 flex flex-col">
                <div className="w-full px-0">
                      <div className="w-full text-center pt-2 pb-2 font-black text-lg tracking-widest" style={{ color: '#FFD600', letterSpacing: '0.12em' }}>BLACKBOARD</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-marker text-white/90 text-xs space-y-2 custom-scrollbar">
                    {logs.length === 0 && <span className="opacity-30 text-white">No updates...</span>}
                    {logs.map(log => (
                        <div key={log.id} className="border-b border-white/10 pb-1 mb-1 last:border-0">
                            <div className="flex justify-between items-center">
                                <span className="text-yellow-400 uppercase">{log.senderName}</span>
                                <span className="text-white/50 text-[10px]">{formatTime(log.timestamp)}</span>
                            </div>
                            <span className="text-white/80">{log.content}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
};

const ProceduralDeskGraphic: React.FC<{ tag?: Tag, isDirtySplodge?: boolean, hasTreasure?: boolean, treasureType?: string, treasureAmount?: number, onTagClick?: () => void }> = ({ tag, isDirtySplodge, hasTreasure, treasureType, treasureAmount, onTagClick }) => {
    // Offset logic: if tagged, move visual down 1 pixel
    const offsetClass = tag ? "translate-y-px" : "";
    const [showImage, setShowImage] = useState(true);

    // Defensive: never show pointer or allow click if onTagClick is undefined
    const pointerClass = onTagClick ? ' cursor-pointer' : '';
    const clickHandler = onTagClick ? onTagClick : undefined;

    return (
      <div className={`w-40 h-32 relative transition-transform duration-200 ${offsetClass}`}>
          {/* Try to show desk image */}
          {showImage && (
              <img 
                  src="/assets/desks/Desk.png" 
                  alt="Desk"
                  className={`w-full h-full object-contain drop-shadow-lg${pointerClass}`}
                  onClick={clickHandler}
                  onError={() => setShowImage(false)}
                  onLoad={() => setShowImage(true)}
                  style={pointerClass ? undefined : { cursor: 'default' }}
              />
          )}
          
          {/* Fallback procedural desk */}
          {!showImage && (
              <div className={`w-full h-full relative${pointerClass}`} onClick={clickHandler} style={pointerClass ? undefined : { cursor: 'default' }}>
                  {/* Desk Legs */}
                  <div className="absolute bottom-0 left-2 w-2 h-12 bg-slate-400"></div>
                  <div className="absolute bottom-0 right-2 w-2 h-12 bg-slate-400"></div>
                  
                  {/* Desk Top */}
                  <div className="absolute bottom-12 left-0 w-full h-2 bg-slate-300"></div>
                  <div className="absolute bottom-12 left-0 w-full h-12 bg-[#eab308] border-b-4 border-[#ca8a04] shadow-md"></div>
                  
                  {/* Dirty Splodge visual indicator */}
                  {isDirtySplodge && <div className="absolute bottom-16 left-8 w-12 h-8 bg-green-500/40 blur-md rounded-full"></div>}
              </div>
          )}
          
          {/* Tag positioned at top of desk */}
          {tag && (
              <div className="absolute left-1/2 -translate-x-1/2 filter drop-shadow-md z-10 animate-in zoom-in duration-300 flex items-center justify-center overflow-hidden" style={{top: '12px'}}>
                  {getTagImagePath(TAG_SYMBOLS_LIST[tag.symbol]?.levelRequired || 1) ? (
                      <img 
                          src={getTagImagePath(TAG_SYMBOLS_LIST[tag.symbol]?.levelRequired || 1)}
                          alt="Tag"
                          className="object-contain drop-shadow-lg"
                          style={{width: '62px', height: '62px', maxWidth: '62px'}}
                      />
                  ) : (
                      <div className="text-3xl">{TAG_SYMBOLS_LIST[tag.symbol]?.name || 'UNKNOWN'}</div>
                  )}
              </div>
          )}
  
          {/* Treasure displayed on desk - only if no tag */}
          {hasTreasure && !tag && (
               <div className="absolute left-1/2 -translate-x-1/2 z-20 animate-bounce" style={{top: '22px', marginLeft: '-23px'}}>
                   {treasureType === 'coins' ? (
                       <img 
                           src="/assets/treasures/Coins.png"
                           alt="Gold Coin"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).outerHTML = '<div class="text-4xl filter drop-shadow-lg">💰</div>'; }}
                       />
                   ) : treasureType === 'coins_pile' ? (
                       <img 
                           src="/assets/treasures/coins_pile.png"
                           alt="Pile of Coins"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).outerHTML = '<div class="text-4xl filter drop-shadow-lg">💰💰</div>'; }}
                       />
                   ) : treasureType === 'chocolate' ? (
                       <img 
                           src="/assets/treasures/chocolate.png"
                           alt="Chocolate"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).outerHTML = '<div class="text-4xl filter drop-shadow-lg">🍫</div>'; }}
                       />
                   ) : treasureType === 'chocolate_pieces' ? (
                       <img 
                           src="/assets/treasures/chocolate_pieces.png"
                           alt="Pieces of Chocolate"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).outerHTML = '<div class="text-4xl filter drop-shadow-lg">🍫🍫</div>'; }}
                       />
                   ) : treasureType === 'hall_pass' ? (
                       <img 
                           src="/assets/treasures/Hall_Pass.png"
                           alt="Hall Pass"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).outerHTML = '<div class="text-4xl filter drop-shadow-lg">🎫</div>'; }}
                       />
                   ) : (
                       <img 
                           src={`/assets/treasures/${treasureType || 'default'}.png`}
                           alt="Treasure"
                           className="object-contain filter drop-shadow-lg"
                           style={{width: '50px', height: '50px'}}
                           onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                       />
                   )}
               </div>
          )}
      </div>
    );
};

const SchoolDesk: React.FC<{ 
  desk: Desk, tag?: Tag, player: Player, isOnCooldown: boolean, isMember: boolean,
    onTagClick: () => void, onCleanClick: () => void, onClaimClick: () => void
}> = ({ desk, tag, player, isOnCooldown, isMember, onTagClick, onCleanClick, onClaimClick }) => {
    const isMatured = tag && (tag.isMatured || (Date.now() - tag.startTime >= tag.durationMs));
    const hasFatigue = player.fatigue > 0;
    const isDirty = !!desk.isDirtySplodge || !!isMatured;
    // Allow cleaning any tag in your own school, regardless of who created it
    const canClean = isMember && (tag || isDirty);
    // In own school, never allow tagging (over or new)
    const canTagOver = !isMember && tag && tag.creatorId !== player.id && tag.schoolId !== player.schoolId && !isMatured;
    const canTagNew = !isMember && !tag && !isDirty && !desk.hasTreasure && player.schoolId !== desk.schoolId;

  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  useEffect(() => {
    if (tag && !isMatured) {
      const update = () => {
        const elapsed = Date.now() - tag.startTime;
        const p = Math.min(1, elapsed / tag.durationMs);
        setProgress(p);
        setTimeRemaining(Math.max(0, tag.durationMs - elapsed));
      };
      update();
      const t = setInterval(update, 1000);
      return () => clearInterval(t);
    }
  }, [tag, isMatured]);

  return (
    <div className="flex flex-col items-center justify-end w-full">
      
      {/* Desk Graphic Area */}
      <div className="relative w-full flex items-center justify-center">
         <div className="absolute inset-0 flex items-center justify-center z-10">
             {/* In own school, only Clean and Collect are actionable; disable all tag click handlers */}
             <ProceduralDeskGraphic tag={tag} isDirtySplodge={desk.isDirtySplodge} hasTreasure={desk.hasTreasure} treasureType={desk.treasureType} treasureAmount={desk.treasureAmount} onTagClick={isMember ? undefined : ((canTagNew && player.schoolId !== desk.schoolId) ? onTagClick : undefined)} />
         </div>

         {/* Maturity Pie Chart - positioned above the desk */}
         {tag && !isMatured && (
            <div className="absolute z-50 animate-float left-1/2 -translate-x-1/2" style={{top: '-100px', marginLeft: '-25px'}}>
                <TagProgressPie progress={progress} timeRemaining={timeRemaining} tag={tag} />
            </div>
         )}
      </div>
      {/* Buttons are rendered by parent ClassView component for consistency */}
    </div>
  );
};

const TaggingModal: React.FC<{ player: Player, schoolLevel: number, existingTag?: Tag, onClose: () => void, onTag: (tool: Tool, symbolIdx: number, cost: number, cleanCost?: number, cleanFatigue?: number) => void, cleanCost?: number, cleanFatigue?: number }> = ({ player, schoolLevel, existingTag, onClose, onTag, cleanCost = 0, cleanFatigue = 0 }) => {
    const [step, setStep] = useState(1); // 1 = Weapon, 2 = Tag
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<number>(0);
    const [weaponCarouselStart, setWeaponCarouselStart] = useState(0);
    const [tagCarouselStart, setTagCarouselStart] = useState(0);

    // Ensure selected weapon is valid for this school level
    useEffect(() => {
        if (selectedTool && selectedTool.levelRequired > schoolLevel) {
            setSelectedTool(null);
        }
    }, [selectedTool, schoolLevel]);

    // Block modal if player is in their own school (defensive UI guard)
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/school\/(school-[^/]+)/);
        const currentSchoolId = match ? match[1] : null;
        if (currentSchoolId && player.schoolId === currentSchoolId) {
            onClose();
        }
    }, [player.schoolId, onClose]);

    const tagCost = TAG_SYMBOLS_LIST[selectedSymbol]?.cost || 0;
    const toolCost = selectedTool?.cost || 0;
    const totalCost = tagCost + toolCost;
    const combinedCost = totalCost + cleanCost;
    const canAfford = player.coins >= combinedCost;
    const projectedCoinReward = toolCost; // Reward equals weapon cost only
    const projectedXPReward = toolCost + tagCost; // XP = weapon cost + tag cost
    const maturationTime = selectedTool ? formatMaturation(selectedTool.maturationMs) : '-';
    
    // Check if selected weapon is valid for this school level
    const weaponTooHigh = selectedTool && selectedTool.levelRequired > schoolLevel;
    const canProceed = selectedTool && !weaponTooHigh;

    const visibleWeapons = INSTRUMENTS.slice(weaponCarouselStart, weaponCarouselStart + 5);
    const visibleTags = TAG_SYMBOLS_LIST.slice(tagCarouselStart, tagCarouselStart + 5);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-gradient-to-br from-yellow-50 via-white to-blue-50 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border-6 border-yellow-400">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 border-b-4 border-yellow-400 flex justify-between items-center">
                    <div>
                        <h2 className="font-marker text-2xl text-white uppercase tracking-wide drop-shadow-lg">
                            {step === 1 ? '⚔️ Select Your Weapon' : '🎨 Select Your Tag'}
                        </h2>
                        <p className="text-xs text-yellow-200 font-bold uppercase tracking-wider">Step {step} of 2</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} className="text-white"/></button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-5 bg-white overflow-hidden">{step === 1 && (
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={() => setWeaponCarouselStart(Math.max(0, weaponCarouselStart - 1))}
                                    disabled={weaponCarouselStart === 0}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex gap-2 flex-1 justify-center">
                                    {visibleWeapons.map(tool => {
                                        const locked = player.level < tool.levelRequired;
                                        const tooHighForSchool = tool.levelRequired > schoolLevel;
                                        const weaponImagePath = locked ? '/assets/weapons/Locked.png' : getWeaponImagePath(tool.name);
                                        const isSelected = selectedTool?.id === tool.id;
                                        const isDisabled = locked || tooHighForSchool;
                                        return (
                                            <button
                                                key={tool.id}
                                                onClick={() => !isDisabled && setSelectedTool(tool)}
                                                disabled={isDisabled}
                                                className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 relative ${
                                                    isSelected ? 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-100 scale-110 shadow-2xl animate-pulse ring-4 ring-yellow-300' : isDisabled ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-blue-200 bg-white hover:border-blue-400 hover:scale-105 shadow-md'
                                                }`}
                                            >
                                                {weaponImagePath ? (
                                                    <img src={weaponImagePath} alt={tool.name} className="w-12 h-12 object-contain drop-shadow-sm" />
                                                ) : (
                                                    <div className="text-3xl">🖌️</div>
                                                )}
                                                {tooHighForSchool && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                                        <div className="text-6xl text-red-600 font-black leading-none" style={{ textShadow: '0 0 8px white, 0 0 12px white' }}>✗</div>
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-black uppercase text-center leading-tight text-gray-800">{tool.name}</span>
                                                {locked ? (
                                                    <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {tool.levelRequired}</div>
                                                ) : tooHighForSchool ? (
                                                    <div className="bg-red-500 px-2 py-0.5 rounded-full text-[9px] font-bold text-white">School Lvl {schoolLevel}</div>
                                                ) : (
                                                    <div className="bg-blue-100 px-2 py-0.5 rounded-full text-xs font-bold text-blue-700">{tool.cost}c</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setWeaponCarouselStart(Math.min(INSTRUMENTS.length - 5, weaponCarouselStart + 1))}
                                    disabled={weaponCarouselStart >= INSTRUMENTS.length - 5}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={() => setTagCarouselStart(Math.max(0, tagCarouselStart - 1))}
                                    disabled={tagCarouselStart === 0}
                                    className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex gap-2 flex-1 justify-center">
                                    {visibleTags.map((sym, idx) => {
                                        const actualIndex = tagCarouselStart + idx;
                                        const locked = player.level < sym.levelRequired;
                                        const tagImagePath = locked ? '/assets/weapons/Locked.png' : getTagImagePath(sym.levelRequired);
                                        const isSelected = selectedSymbol === actualIndex;
                                        return (
                                            <button
                                                key={actualIndex}
                                                onClick={() => !locked && setSelectedSymbol(actualIndex)}
                                                disabled={locked}
                                                className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 ${
                                                    isSelected ? 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-100 scale-110 shadow-2xl animate-pulse ring-4 ring-yellow-300' : locked ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-purple-200 bg-white hover:border-purple-400 hover:scale-105 shadow-md'
                                                }`}
                                            >
                                                {tagImagePath ? (
                                                    <img src={tagImagePath} alt={`Tag ${sym.levelRequired}`} className="w-12 h-12 object-contain drop-shadow-sm" />
                                                ) : (
                                                    <div className="text-3xl">{sym.name}</div>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-500">Lvl {sym.levelRequired}</span>
                                                {locked ? (
                                                    <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {sym.levelRequired}</div>
                                                ) : (
                                                    <div className="bg-purple-100 px-2 py-0.5 rounded-full text-xs font-bold text-purple-700">{sym.cost}c</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setTagCarouselStart(Math.min(TAG_SYMBOLS_LIST.length - 5, tagCarouselStart + 1))}
                                    disabled={tagCarouselStart >= TAG_SYMBOLS_LIST.length - 5}
                                    className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Info Display */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 border-2 border-blue-200 shadow-inner">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-yellow-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💰 Your Coins</div>
                                <div className="text-lg font-black text-green-600">{player.coins}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-red-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💸 Total Cost</div>
                                <div className="text-lg font-black text-red-600">{combinedCost}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-blue-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">⏱️ Matures In</div>
                                <div className="text-lg font-black text-blue-600">{maturationTime}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-green-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">✨ Your XP</div>
                                <div className="text-lg font-black text-green-600">+{projectedXPReward}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-amber-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">🏫 School XP</div>
                                <div className="text-lg font-black text-amber-600">+{projectedXPReward}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-purple-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">🪙 Coins Earned</div>
                                <div className="text-lg font-black text-purple-600">+{projectedCoinReward}c</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t-4 border-yellow-400 bg-gradient-to-r from-blue-100 to-purple-100 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-black text-sm uppercase rounded-xl hover:bg-gray-100 transition-all shadow-md"
                        >
                            ← Back
                        </button>
                    )}
                    {step === 1 ? (
                        <button
                            disabled={!canProceed}
                            onClick={() => canProceed && setStep(2)}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-[4px] hover:from-blue-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                        >
                            {weaponTooHigh ? '❌ Weapon Too High' : 'Next Step →'}
                        </button>
                    ) : (
                        <button
                            disabled={!canAfford}
                            onClick={() => selectedTool && onTag(selectedTool, selectedSymbol, totalCost, cleanCost, cleanFatigue)}
                            className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#065f46] active:shadow-none active:translate-y-[4px] hover:from-emerald-400 hover:to-green-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 ${canAfford ? 'animate-pulse' : ''}`}
                        >
                            {canAfford ? `🎯 PLACE TAG` : '❌ Need More Coins'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CleaningModal: React.FC<{ player: Player, targetTag?: Tag, onClose: () => void, onClean: (tool: Tool) => void }> = ({ player, targetTag, onClose, onClean }) => {
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [carouselStart, setCarouselStart] = useState(0);
    
    const selectedFatigue = selectedTool ? calculateSpecificFatigue(selectedTool.levelRequired, targetTag) : 0;
    const canAfford = selectedTool ? player.coins >= selectedTool.cost : false;
    const visibleCleaners = CLEANING_TOOLS.slice(carouselStart, carouselStart + 5);
    
    // Calculate XP rewards
    const yourXP = 5; // Base XP for cleaning
    const schoolXP = 5; // School gets 5 points for cleaning
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border-6 border-green-400">
                
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-green-600 border-b-4 border-green-400 flex justify-between items-center">
                    <div>
                        <h2 className="font-marker text-2xl text-white uppercase tracking-wide drop-shadow-lg">
                            🧹 Select Your Cleaner
                        </h2>
                        <p className="text-xs text-green-200 font-bold uppercase tracking-wider">Choose Your Tool</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} className="text-white"/></button>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 p-5 bg-white overflow-hidden">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <button
                            onClick={() => setCarouselStart(Math.max(0, carouselStart - 1))}
                            disabled={carouselStart === 0}
                            className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex gap-2 flex-1 justify-center">
                            {visibleCleaners.map(tool => {
                                const locked = player.level < tool.levelRequired;
                                const cleanerImagePath = locked ? '/assets/weapons/Locked.png' : getCleanerImagePath(tool.name);
                                const isSelected = selectedTool?.id === tool.id;
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => !locked && setSelectedTool(tool)}
                                        disabled={locked}
                                        className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 ${
                                            isSelected ? 'border-emerald-400 bg-gradient-to-br from-emerald-100 to-green-100 scale-110 shadow-2xl animate-pulse ring-4 ring-emerald-300' : locked ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-emerald-200 bg-white hover:border-emerald-400 hover:scale-105 shadow-md'
                                        }`}
                                    >
                                        {cleanerImagePath ? (
                                            <img src={cleanerImagePath} alt={tool.name} className="w-12 h-12 object-contain drop-shadow-sm" />
                                        ) : (
                                            <div className="text-3xl">🧽</div>
                                        )}
                                        <span className="text-[10px] font-black uppercase text-center leading-tight text-gray-800">{tool.name}</span>
                                        {locked ? (
                                            <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {tool.levelRequired}</div>
                                        ) : (
                                            <div className="bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold text-emerald-700">{tool.cost}c</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCarouselStart(Math.min(CLEANING_TOOLS.length - 5, carouselStart + 1))}
                            disabled={carouselStart >= CLEANING_TOOLS.length - 5}
                            className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Info Display */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border-2 border-emerald-200 shadow-inner">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-green-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💰 Your Coins</div>
                                <div className="text-lg font-black text-green-600">{player.coins}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-red-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💸 Cost</div>
                                <div className="text-lg font-black text-red-600">{selectedTool?.cost || 0}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-orange-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">😓 Fatigue</div>
                                <div className="text-sm font-black text-orange-600">{selectedFatigue > 0 ? formatFatigueTime(selectedFatigue) : 'None'}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-blue-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">✨ Your XP</div>
                                <div className="text-lg font-black text-blue-600">+{yourXP}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-amber-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">🏫 School XP</div>
                                <div className="text-lg font-black text-amber-600">+{schoolXP}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-purple-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">🪙 Coins Earned</div>
                                <div className="text-lg font-black text-purple-600">+0c</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t-4 border-green-400 bg-gradient-to-r from-emerald-100 to-green-100 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-black text-sm uppercase rounded-xl hover:bg-gray-100 transition-all shadow-md"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!selectedTool || !canAfford}
                        onClick={() => {
                            if (selectedTool) {
                                onClean(selectedTool);
                            }
                        }}
                        className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#065f46] active:shadow-none active:translate-y-[4px] hover:from-emerald-400 hover:to-green-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 ${canAfford && selectedTool ? 'animate-pulse' : ''}`}
                    >
                        {!selectedTool ? '👆 Select Tool' : canAfford ? `🧹 CLEAN TAG` : '❌ Need More Coins'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TagOverModal: React.FC<{ 
    player: Player, 
    schoolLevel: number,
    existingTag: Tag, 
    onClose: () => void, 
    onTagOver: (cleaner: Tool, weapon: Tool, symbolIdx: number) => void 
}> = ({ player, schoolLevel, existingTag, onClose, onTagOver }) => {
    const [step, setStep] = useState(1); // 1 = Cleaner, 2 = Weapon, 3 = Tag
    const [selectedCleaner, setSelectedCleaner] = useState<Tool | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<Tool | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<number>(0);
    const [cleanerCarouselStart, setCleanerCarouselStart] = useState(0);
    const [weaponCarouselStart, setWeaponCarouselStart] = useState(0);
    const [tagCarouselStart, setTagCarouselStart] = useState(0);

    const cleanerCost = selectedCleaner?.cost || 0;
    const cleanerFatigue = selectedCleaner ? calculateSpecificFatigue(selectedCleaner.levelRequired, existingTag) : 0;
    const weaponCost = selectedWeapon?.cost || 0;
    const tagCost = TAG_SYMBOLS_LIST[selectedSymbol]?.cost || 0;
    const totalCost = cleanerCost + weaponCost + tagCost;
    const canAfford = player.coins >= totalCost;
    
    const projectedCleanXP = 5;
    const projectedTagXP = weaponCost + tagCost;
    const totalXP = projectedCleanXP + projectedTagXP;
    const projectedCoinReward = weaponCost;
    const maturationTime = selectedWeapon ? formatMaturation(selectedWeapon.maturationMs) : '-';

    // Check if selected weapon is too high for school level
    const weaponTooHigh = selectedWeapon && selectedWeapon.levelRequired > schoolLevel;
    
    const visibleCleaners = CLEANING_TOOLS.slice(cleanerCarouselStart, cleanerCarouselStart + 5);
    const visibleWeapons = INSTRUMENTS.slice(weaponCarouselStart, weaponCarouselStart + 5);
    const visibleTags = TAG_SYMBOLS_LIST.slice(tagCarouselStart, tagCarouselStart + 5);

    // Auto-deselect weapon if it's too high for school level
    useEffect(() => {
        if (weaponTooHigh) {
            setSelectedWeapon(null);
        }
    }, [weaponTooHigh]);

    const getStepTitle = () => {
        if (step === 1) return '🧹 Select Your Cleaner';
        if (step === 2) return '⚔️ Select Your Weapon';
        return '🎨 Select Your Tag';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border-6 border-orange-400">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-orange-600 to-red-600 border-b-4 border-orange-400 flex justify-between items-center">
                    <div>
                        <h2 className="font-marker text-2xl text-white uppercase tracking-wide drop-shadow-lg">
                            {getStepTitle()}
                        </h2>
                        <p className="text-xs text-orange-200 font-bold uppercase tracking-wider">Tag Over - Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} className="text-white"/></button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-5 bg-white overflow-hidden">
                    {/* Step 1: Cleaner Selection */}
                    {step === 1 && (
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={() => setCleanerCarouselStart(Math.max(0, cleanerCarouselStart - 1))}
                                    disabled={cleanerCarouselStart === 0}
                                    className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex gap-2 flex-1 justify-center">
                                    {visibleCleaners.map(tool => {
                                        const locked = player.level < tool.levelRequired;
                                        const cleanerImagePath = locked ? '/assets/weapons/Locked.png' : getCleanerImagePath(tool.name);
                                        const isSelected = selectedCleaner?.id === tool.id;
                                        return (
                                            <button
                                                key={tool.id}
                                                onClick={() => !locked && setSelectedCleaner(tool)}
                                                disabled={locked}
                                                className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 ${
                                                    isSelected ? 'border-emerald-400 bg-gradient-to-br from-emerald-100 to-green-100 scale-110 shadow-2xl animate-pulse ring-4 ring-emerald-300' : locked ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-emerald-200 bg-white hover:border-emerald-400 hover:scale-105 shadow-md'
                                                }`}
                                            >
                                                {cleanerImagePath ? (
                                                    <img src={cleanerImagePath} alt={tool.name} className="w-12 h-12 object-contain drop-shadow-sm" />
                                                ) : (
                                                    <div className="text-3xl">🧽</div>
                                                )}
                                                <span className="text-[10px] font-black uppercase text-center leading-tight text-gray-800">{tool.name}</span>
                                                {locked ? (
                                                    <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {tool.levelRequired}</div>
                                                ) : (
                                                    <div className="bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold text-emerald-700">{tool.cost}c</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCleanerCarouselStart(Math.min(CLEANING_TOOLS.length - 5, cleanerCarouselStart + 1))}
                                    disabled={cleanerCarouselStart >= CLEANING_TOOLS.length - 5}
                                    className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Weapon Selection */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={() => setWeaponCarouselStart(Math.max(0, weaponCarouselStart - 1))}
                                    disabled={weaponCarouselStart === 0}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex gap-2 flex-1 justify-center">
                                    {visibleWeapons.map(tool => {
                                        const locked = player.level < tool.levelRequired;
                                        const tooHighForSchool = tool.levelRequired > schoolLevel;
                                        const weaponImagePath = locked ? '/assets/weapons/Locked.png' : getWeaponImagePath(tool.name);
                                        const isSelected = selectedWeapon?.id === tool.id;
                                        return (
                                            <button
                                                key={tool.id}
                                                onClick={() => {
                                                    if (!locked && !tooHighForSchool) {
                                                        setSelectedWeapon(tool);
                                                    }
                                                }}
                                                disabled={locked || tooHighForSchool}
                                                className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 relative ${
                                                    isSelected ? 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-100 scale-110 shadow-2xl animate-pulse ring-4 ring-yellow-300' : 
                                                    (locked || tooHighForSchool) ? 'border-gray-300 bg-gray-100 opacity-60' : 
                                                    'border-blue-200 bg-white hover:border-blue-400 hover:scale-105 shadow-md'
                                                }`}
                                            >
                                                <div className="relative">
                                                    {weaponImagePath ? (
                                                        <img src={weaponImagePath} alt={tool.name} className="w-12 h-12 object-contain drop-shadow-sm" />
                                                    ) : (
                                                        <div className="text-3xl">🖌️</div>
                                                    )}
                                                    {!locked && tooHighForSchool && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="text-5xl font-bold text-red-600 drop-shadow-lg">✗</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-center leading-tight text-gray-800">{tool.name}</span>
                                                {locked ? (
                                                    <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {tool.levelRequired}</div>
                                                ) : (
                                                    <div className="bg-blue-100 px-2 py-0.5 rounded-full text-xs font-bold text-blue-700">{tool.cost}c</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setWeaponCarouselStart(Math.min(INSTRUMENTS.length - 5, weaponCarouselStart + 1))}
                                    disabled={weaponCarouselStart >= INSTRUMENTS.length - 5}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Tag Selection */}
                    {step === 3 && (
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <button
                                    onClick={() => setTagCarouselStart(Math.max(0, tagCarouselStart - 1))}
                                    disabled={tagCarouselStart === 0}
                                    className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex gap-2 flex-1 justify-center">
                                    {visibleTags.map((sym, idx) => {
                                        const actualIndex = tagCarouselStart + idx;
                                        const locked = player.level < sym.levelRequired;
                                        const tagImagePath = locked ? '/assets/weapons/Locked.png' : getTagImagePath(sym.levelRequired);
                                        const isSelected = selectedSymbol === actualIndex;
                                        return (
                                            <button
                                                key={actualIndex}
                                                onClick={() => !locked && setSelectedSymbol(actualIndex)}
                                                disabled={locked}
                                                className={`p-3 rounded-xl border-3 flex flex-col items-center gap-1 transition-all w-28 ${
                                                    isSelected ? 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-100 scale-110 shadow-2xl animate-pulse ring-4 ring-yellow-300' : locked ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-purple-200 bg-white hover:border-purple-400 hover:scale-105 shadow-md'
                                                }`}
                                            >
                                                {tagImagePath ? (
                                                    <img src={tagImagePath} alt={`Tag ${sym.levelRequired}`} className="w-12 h-12 object-contain drop-shadow-sm" />
                                                ) : (
                                                    <div className="text-3xl">{sym.name}</div>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-500">Lvl {sym.levelRequired}</span>
                                                {locked ? (
                                                    <div className="bg-red-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600">Lvl {sym.levelRequired}</div>
                                                ) : (
                                                    <div className="bg-purple-100 px-2 py-0.5 rounded-full text-xs font-bold text-purple-700">{sym.cost}c</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setTagCarouselStart(Math.min(TAG_SYMBOLS_LIST.length - 5, tagCarouselStart + 1))}
                                    disabled={tagCarouselStart >= TAG_SYMBOLS_LIST.length - 5}
                                    className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Info Display */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border-2 border-orange-200 shadow-inner">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-green-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💰 Your Coins</div>
                                <div className="text-lg font-black text-green-600">{player.coins}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-red-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">💸 Total Cost</div>
                                <div className="text-lg font-black text-red-600">{totalCost}c</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-orange-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">😓 Fatigue</div>
                                <div className="text-sm font-black text-orange-600">{cleanerFatigue > 0 ? formatFatigueTime(cleanerFatigue) : 'None'}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-blue-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">✨ Your XP</div>
                                <div className="text-lg font-black text-blue-600">+{totalXP}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-amber-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">🏫 School XP</div>
                                <div className="text-lg font-black text-amber-600">+{totalXP}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-purple-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">⏱️ Matures</div>
                                <div className="text-sm font-black text-purple-600">{maturationTime}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t-4 border-orange-400 bg-gradient-to-r from-orange-100 to-red-100 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-black text-sm uppercase rounded-xl hover:bg-gray-100 transition-all shadow-md"
                        >
                            ← Back
                        </button>
                    )}
                    {step === 1 ? (
                        <button
                            disabled={!selectedCleaner}
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#991b1b] active:shadow-none active:translate-y-[4px] hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                        >
                            {selectedCleaner ? 'Choose Weapon →' : '👆 Select Cleaner'}
                        </button>
                    ) : step === 2 ? (
                        <button
                            disabled={!selectedWeapon}
                            onClick={() => setStep(3)}
                            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#991b1b] active:shadow-none active:translate-y-[4px] hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                        >
                            {selectedWeapon ? 'Choose Tag →' : '👆 Select Weapon'}
                        </button>
                    ) : (
                        <button
                            disabled={!canAfford || !selectedCleaner || !selectedWeapon}
                            onClick={() => selectedCleaner && selectedWeapon && onTagOver(selectedCleaner, selectedWeapon, selectedSymbol)}
                            className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#065f46] active:shadow-none active:translate-y-[4px] hover:from-emerald-400 hover:to-green-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 ${canAfford ? 'animate-pulse' : ''}`}
                        >
                            {canAfford ? `🔥 TAG OVER!` : '❌ Need More Coins'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminConsole: React.FC<{ state: GameState, onUpdateState: (s: GameState) => void, onClose: () => void }> = ({ state, onUpdateState, onClose }) => {
    const [activeTab, setActiveTab] = useState<'players' | 'schools' | 'treasures'>('players');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
    const [coinAdjustment, setCoinAdjustment] = useState('');
    const [xpAdjustment, setXpAdjustment] = useState('');
    const [fatigueAdjustment, setFatigueAdjustment] = useState('');
    const [schoolNameEdit, setSchoolNameEdit] = useState('');
    const [schoolXpEdit, setSchoolXpEdit] = useState('');
    const [treasureInterval, setTreasureInterval] = useState('120'); // Default 2 minutes in seconds
    const [treasureWeights, setTreasureWeights] = useState(() => 
        TREASURE_TYPES.map(t => ({ ...t }))
    );

    const allPlayers = [
        state.player,
        ...state.schools.flatMap(s => (s.members || [])
            .filter(m => m.id !== state.player.id)
            .map(m => ({
                ...m,
                // Ensure all player fields exist for members
                coins: m.coins || 0,
                xp: m.reputation || 0,
                fatigue: m.fatigue || 0,
                inventory: m.inventory || [],
                backpackSize: m.backpackSize || 10,
                nameChangeCost: m.nameChangeCost || 100,
                schoolId: s.id,
                stats: m.stats || { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 }
            })))
    ];

    const selectedPlayer = allPlayers.find(p => p.id === selectedPlayerId);
    const selectedSchool = state.schools.find(s => s.id === selectedSchoolId);

    const handleAddCoins = () => {
        const amount = parseInt(coinAdjustment);
        if (!selectedPlayerId || isNaN(amount)) return;
        
        const newState = { ...state };
        const isRealPlayer = /^\d+$/.test(selectedPlayerId); // Real players have numeric IDs
        
        if (selectedPlayerId === state.player.id) {
            newState.player = { ...state.player, coins: state.player.coins + amount };
        } else if (isRealPlayer) {
            // For real players (numeric ID), update in schools members array AND sync to backend
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, coins: (m.coins || 0) + amount } : m
                )
            }));
            
            // Also update the player on the backend immediately
            const playerToUpdate = allPlayers.find(p => p.id === selectedPlayerId);
            if (playerToUpdate) {
                const updatedPlayer = { ...playerToUpdate, coins: (playerToUpdate.coins || 0) + amount };
                fetch(`http://localhost:4000/api/player/${selectedPlayerId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedPlayer)
                }).catch(err => console.error('Failed to update player coins on backend:', err));
            }
        } else {
            // For NPCs (non-numeric ID), only update in schools members array
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, coins: (m.coins || 0) + amount } : m
                )
            }));
        }
        onUpdateState(newState);
        setCoinAdjustment('');
    };

    const handleAddXp = () => {
        const amount = parseInt(xpAdjustment);
        if (!selectedPlayerId || isNaN(amount)) return;
        
        const newState = { ...state };
        const isRealPlayer = /^\d+$/.test(selectedPlayerId); // Real players have numeric IDs
        
        if (selectedPlayerId === state.player.id) {
            let newPlayer = { ...state.player, xp: Math.max(0, state.player.xp + amount) };
            // Check for level up (use while loop to handle multiple levels) and award bonus coins
            let xpNeeded = getXpForLevel(newPlayer.level + 1);
            while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                newPlayer.level += 1;
                newPlayer.coins += 100; // Award 100 coins per level
                xpNeeded = getXpForLevel(newPlayer.level + 1);
            }
            newState.player = newPlayer;
        } else if (isRealPlayer) {
            // For real players (numeric ID), update in schools members array AND sync to backend
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, reputation: Math.max(0, (m.reputation || 0) + amount) } : m
                )
            }));
            
            // Also update the player on the backend immediately
            const playerToUpdate = allPlayers.find(p => p.id === selectedPlayerId);
            if (playerToUpdate) {
                const updatedPlayer = { ...playerToUpdate, xp: Math.max(0, (playerToUpdate.xp || 0) + amount) };
                fetch(`http://localhost:4000/api/player/${selectedPlayerId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedPlayer)
                }).catch(err => console.error('Failed to update player XP on backend:', err));
            }
        } else {
            // For NPCs (non-numeric ID), only update in schools members array
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, reputation: Math.max(0, (m.reputation || 0) + amount) } : m
                )
            }));
        }
        onUpdateState(newState);
        setXpAdjustment('');
    };

    const handleSetFatigue = () => {
        const amount = parseInt(fatigueAdjustment);
        if (!selectedPlayerId || isNaN(amount) || amount < 0) return;
        
        const newState = { ...state };
        const isRealPlayer = /^\d+$/.test(selectedPlayerId); // Real players have numeric IDs
        
        if (selectedPlayerId === state.player.id) {
            newState.player = { ...state.player, fatigue: amount };
        } else if (isRealPlayer) {
            // For real players (numeric ID), update in schools members array AND sync to backend
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, fatigue: amount } : m
                )
            }));
            
            // Also update the player on the backend immediately
            const playerToUpdate = allPlayers.find(p => p.id === selectedPlayerId);
            if (playerToUpdate) {
                const updatedPlayer = { ...playerToUpdate, fatigue: amount };
                fetch(`http://localhost:4000/api/player/${selectedPlayerId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedPlayer)
                }).catch(err => console.error('Failed to update player fatigue on backend:', err));
            }
        } else {
            // For NPCs (non-numeric ID), only update in schools members array
            newState.schools = state.schools.map(school => ({
                ...school,
                members: (school.members || []).map(m => 
                    m.id === selectedPlayerId ? { ...m, fatigue: amount } : m
                )
            }));
        }
        onUpdateState(newState);
        setFatigueAdjustment('');
    };

    const handleDeletePlayer = async () => {
        if (!selectedPlayerId) return;
        
        const playerToDelete = allPlayers.find(p => p.id === selectedPlayerId);
        if (!playerToDelete) return;
        
        // Confirm deletion
        const confirmed = window.confirm(
            `⚠️ DELETE PLAYER\n\n` +
            `This will permanently delete "${playerToDelete.name}" (ID: ${selectedPlayerId}) and ALL associated data:\n\n` +
            `• Player account and profile\n` +
            `• All tags placed by this player\n` +
            `• All blackboard logs\n` +
            `• All global logs mentioning this player\n` +
            `• Their school (if they're the only member)\n\n` +
            `This action CANNOT be undone!\n\n` +
            `Type the player's name to confirm: "${playerToDelete.name}"`
        );
        
        if (!confirmed) return;
        
        const confirmName = window.prompt(`Type "${playerToDelete.name}" to confirm deletion:`);
        if (confirmName !== playerToDelete.name) {
            alert('Name did not match. Deletion cancelled.');
            return;
        }
        
        try {
            // Delete from backend database (users table)
            const isNumericId = /^\d+$/.test(selectedPlayerId);
            if (isNumericId) {
                const response = await fetch(`http://localhost:4000/api/user/${selectedPlayerId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    throw new Error('Failed to delete user from database');
                }
            }
            
            // Clean up game state
            let newState = { ...state };
            
            // 1. Remove all tags created by this player
            newState.activeTags = (newState.activeTags || []).filter(tag => tag.creatorId !== selectedPlayerId);
            
            // 2. Remove all global logs mentioning this player
            newState.globalLogs = (newState.globalLogs || []).filter(log => 
                !log.message?.includes(playerToDelete.name) && 
                log.playerId !== selectedPlayerId &&
                log.cleanerId !== selectedPlayerId
            );
            
            // 3. Remove player from their school and clean up blackboard logs
            const playerSchool = newState.schools.find(s => s.id === playerToDelete.schoolId);
            if (playerSchool) {
                const memberIds = (playerSchool.memberIds || []).filter(id => id !== selectedPlayerId);
                const members = (playerSchool.members || []).filter(m => m.id !== selectedPlayerId);
                
                // Clean blackboard logs from all classes in the school
                const cleanedClasses = (playerSchool.classes || []).map(cls => ({
                    ...cls,
                    blackboardLogs: (cls.blackboardLogs || []).filter(log => log.playerId !== selectedPlayerId)
                }));
                
                // If this was the only member, delete the school entirely
                if (memberIds.length === 0) {
                    newState.schools = newState.schools.filter(s => s.id !== playerSchool.id);
                    
                    // Also delete school from backend
                    await fetch(`http://localhost:4000/api/school/${playerSchool.id}`, {
                        method: 'DELETE'
                    });
                } else {
                    // Update the school with cleaned data
                    newState.schools = newState.schools.map(s => 
                        s.id === playerSchool.id 
                            ? { 
                                ...s, 
                                memberIds,
                                members,
                                classes: cleanedClasses,
                                // If deleted player was principal, promote first remaining member
                                principalId: s.principalId === selectedPlayerId ? memberIds[0] : s.principalId,
                                principalName: s.principalId === selectedPlayerId ? members[0]?.name : s.principalName
                            }
                            : s
                    );
                }
            }
            
            // 4. If the deleted player was the current player, log them out
            if (selectedPlayerId === state.player.id) {
                localStorage.removeItem('player');
                localStorage.removeItem('school_vandals_save_v20');
                window.location.hash = '#/login';
                window.location.reload();
                return;
            }
            
            onUpdateState(newState);
            setSelectedPlayerId(null);
            alert(`✅ Player "${playerToDelete.name}" has been permanently deleted.`);
            
        } catch (error) {
            console.error('Error deleting player:', error);
            alert('❌ Failed to delete player. Check console for details.');
        }
    };

    const handleUpdateSchoolName = () => {
        if (!selectedSchoolId || !schoolNameEdit.trim()) return;
        
        const newState = {
            ...state,
            schools: state.schools.map(s => 
                s.id === selectedSchoolId ? { ...s, name: schoolNameEdit.trim() } : s
            )
        };
        onUpdateState(newState);
    };

    const handleUpdateSchoolXp = () => {
        const amount = parseInt(schoolXpEdit);
        if (!selectedSchoolId || isNaN(amount)) return;
        
        const newState = {
            ...state,
            schools: state.schools.map(s => 
                s.id === selectedSchoolId ? { ...s, points: Math.max(0, s.points + amount) } : s
            )
        };
        onUpdateState(newState);
        setSchoolXpEdit('');
    };

    const handleTreasureToggle = (index: number) => {
        const updated = [...treasureWeights];
        updated[index] = { ...updated[index], weight: updated[index].weight > 0 ? 0 : 50 };
        setTreasureWeights(updated);
        // Update constants in runtime (this won't persist after refresh)
        TREASURE_TYPES[index].weight = updated[index].weight;
    };

    const handleWeightChange = (index: number, newWeight: number) => {
        const updated = [...treasureWeights];
        updated[index] = { ...updated[index], weight: Math.max(0, Math.min(100, newWeight)) };
        setTreasureWeights(updated);
        TREASURE_TYPES[index].weight = updated[index].weight;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl">
                    <div>
                        <h1 className="font-black text-2xl text-white">🔧 Admin Console</h1>
                        <p className="text-slate-300 text-xs">Manage players and game settings</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all text-sm"
                    >
                        ✕ Close
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-slate-200 bg-slate-50">
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            activeTab === 'players' 
                                ? 'bg-blue-500 text-white shadow' 
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        👥 Players ({allPlayers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('schools')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            activeTab === 'schools' 
                                ? 'bg-purple-500 text-white shadow' 
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        🏫 Schools ({state.schools.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('treasures')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            activeTab === 'treasures' 
                                ? 'bg-amber-500 text-white shadow' 
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        💎 Treasures
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden p-4">
                    {/* Players Tab */}
                    {activeTab === 'players' && (
                    <div className="h-full grid grid-cols-3 gap-4">
                        {/* Player List - 1/3 width */}
                        <div className="bg-slate-50 rounded-xl p-3 flex flex-col min-h-0">
                            <h2 className="font-bold text-lg mb-3 text-slate-800">All Players ({allPlayers.length})</h2>
                            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                                {allPlayers.map(player => {
                                    const school = state.schools.find(s => s.id === player.schoolId);
                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => setSelectedPlayerId(player.id)}
                                            className={`w-full p-2 rounded-lg border text-left transition-all text-sm ${
                                                selectedPlayerId === player.id
                                                    ? 'border-blue-500 bg-blue-50 shadow'
                                                    : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 shrink-0">
                                                    <img 
                                                        src={`/assets/Avatars/${player.avatar || 'Avatar001.png'}`} 
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="font-bold text-sm truncate">{player.name}</div>
                                            </div>
                                            <div className="text-xs text-slate-500 truncate ml-10">
                                                Lvl {player.level} • {school?.name || 'No School'}
                                            </div>
                                            <div className="flex gap-2 mt-1 text-xs ml-10">
                                                <span className="text-green-600 font-bold">{player.coins}c</span>
                                                <span className="text-slate-500">{player.xp} XP</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Player Details - 2/3 width */}
                        <div className="col-span-2 bg-slate-50 rounded-xl p-3 flex flex-col min-h-0">
                            <h2 className="font-bold text-lg mb-3 text-slate-800">Player Management</h2>
                            {selectedPlayer ? (
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                                    {/* Player Info - Compact */}
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-slate-300 shrink-0">
                                                <img 
                                                    src={`/assets/Avatars/${selectedPlayer.avatar || 'Avatar001.png'}`} 
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{selectedPlayer.name}</h3>
                                                <div className="text-xs text-slate-400 font-mono">ID: {selectedPlayer.id}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-xs">
                                            <div>
                                                <div className="text-slate-500 uppercase">Level</div>
                                                <div className="font-bold">{selectedPlayer.level}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 uppercase">XP</div>
                                                <div className="font-bold">{selectedPlayer.xp}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 uppercase">Coins</div>
                                                <div className="font-bold text-green-600">{selectedPlayer.coins}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 uppercase">Fatigue</div>
                                                <div className="font-bold text-orange-600 text-xs">
                                                    {selectedPlayer.fatigue > 0 ? formatFatigueTime(selectedPlayer.fatigue) : 'None'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Coin Management */}
                                        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                                            <h3 className="font-bold text-xs mb-1">💰 Coins</h3>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    value={coinAdjustment}
                                                    onChange={(e) => setCoinAdjustment(e.target.value)}
                                                    placeholder="+/-"
                                                    className="flex-1 px-2 py-1 border border-green-300 rounded text-xs"
                                                />
                                                <button
                                                    onClick={handleAddCoins}
                                                    disabled={!coinAdjustment}
                                                    className="px-2 py-1 bg-green-500 text-white font-bold rounded text-xs hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        {/* XP Management */}
                                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                                            <h3 className="font-bold text-xs mb-1">✨ XP</h3>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    value={xpAdjustment}
                                                    onChange={(e) => setXpAdjustment(e.target.value)}
                                                    placeholder="+/-"
                                                    className="flex-1 px-2 py-1 border border-purple-300 rounded text-xs"
                                                />
                                                <button
                                                    onClick={handleAddXp}
                                                    disabled={!xpAdjustment}
                                                    className="px-2 py-1 bg-purple-500 text-white font-bold rounded text-xs hover:bg-purple-600 disabled:opacity-50"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fatigue Management */}
                                        <div className="p-2 bg-orange-50 rounded-lg border border-orange-200 col-span-2">
                                            <h3 className="font-bold text-xs mb-1">😓 Fatigue (seconds)</h3>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    value={fatigueAdjustment}
                                                    onChange={(e) => setFatigueAdjustment(e.target.value)}
                                                    placeholder="0 to clear"
                                                    className="flex-1 px-2 py-1 border border-orange-300 rounded text-xs"
                                                />
                                                <button
                                                    onClick={handleSetFatigue}
                                                    disabled={!fatigueAdjustment}
                                                    className="px-2 py-1 bg-orange-500 text-white font-bold rounded text-xs hover:bg-orange-600 disabled:opacity-50"
                                                >
                                                    Set
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats - Compact */}
                                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                        <h3 className="font-bold text-xs mb-2">📊 Statistics</h3>
                                        <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Tags:</span>
                                                <span className="font-bold">{selectedPlayer.stats?.tagsPlaced || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Cleaned:</span>
                                                <span className="font-bold">{selectedPlayer.stats?.tagsCleaned || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Treasures:</span>
                                                <span className="font-bold">{selectedPlayer.stats?.treasuresFound || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Backpack:</span>
                                                <span className="font-bold">{selectedPlayer.inventory?.length || 0}/{selectedPlayer.backpackSize}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete - Danger Zone */}
                                    <div className="p-3 bg-red-50 rounded-lg border-2 border-red-300">
                                        <h3 className="font-bold text-xs text-red-700 mb-1">⚠️ Danger Zone</h3>
                                        <p className="text-xs text-red-600 mb-2">
                                            Permanently delete this player and all data. Cannot be undone!
                                        </p>
                                        <button
                                            onClick={handleDeletePlayer}
                                            className="w-full py-2 bg-red-600 text-white font-bold rounded text-sm hover:bg-red-700 transition-all"
                                        >
                                            🗑️ Delete Player
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">👤</div>
                                        <div className="font-bold text-sm">Select a player</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Schools Tab */}
                {activeTab === 'schools' && (
                    <div className="h-full grid grid-cols-3 gap-4">
                        {/* School List */}
                        <div className="bg-slate-50 rounded-xl p-3 flex flex-col min-h-0">
                            <h2 className="font-bold text-lg mb-3 text-slate-800">All Schools ({state.schools.length})</h2>
                            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                                {state.schools.map(school => {
                                    const memberCount = school.members?.length || 0;
                                    const classCount = school.classes?.length || 0;
                                    return (
                                        <button
                                            key={school.id}
                                            onClick={() => { setSelectedSchoolId(school.id); setSchoolNameEdit(school.name); }}
                                            className={`w-full p-2 rounded-lg border text-left transition-all text-sm ${
                                                selectedSchoolId === school.id
                                                    ? 'border-purple-500 bg-purple-50 shadow'
                                                    : 'border-slate-200 hover:border-purple-300 hover:bg-white bg-white'
                                            }`}
                                        >
                                            <div className="font-bold text-sm truncate">{school.name}</div>
                                            <div className="text-xs text-slate-500 truncate">
                                                Lvl {school.level} • {memberCount} members
                                            </div>
                                            <div className="flex gap-2 mt-1 text-xs">
                                                <span className="text-purple-600 font-bold">{school.points} XP</span>
                                                <span className="text-slate-500">{classCount} classes</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* School Details */}
                        <div className="col-span-2 bg-slate-50 rounded-xl p-3 flex flex-col min-h-0">
                            <h2 className="font-bold text-lg mb-3 text-slate-800">School Management</h2>
                            {selectedSchool ? (
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                        <h3 className="font-bold mb-1">{selectedSchool.name}</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <div className="text-slate-500">Level</div>
                                                <div className="font-bold">{selectedSchool.level}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500">Points</div>
                                                <div className="font-bold">{selectedSchool.points}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500">Tags</div>
                                                <div className="font-bold">{selectedSchool.totalTags || 0}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500">Cleans</div>
                                                <div className="font-bold">{selectedSchool.totalCleans || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-slate-100 rounded-lg text-xs">
                                        <div className="font-bold mb-1">Principal: {selectedSchool.principalName}</div>
                                        <div className="text-slate-600">Members: {selectedSchool.members?.length || 0} • Classes: {selectedSchool.classes?.length || 0}</div>
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                        <h3 className="font-bold text-xs mb-1">Rename School</h3>
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={schoolNameEdit}
                                                onChange={(e) => setSchoolNameEdit(e.target.value)}
                                                className="flex-1 px-2 py-1 border border-blue-300 rounded text-xs"
                                            />
                                            <button
                                                onClick={handleUpdateSchoolName}
                                                className="px-2 py-1 bg-blue-500 text-white font-bold rounded text-xs hover:bg-blue-600"
                                            >
                                                Rename
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                                        <h3 className="font-bold text-xs mb-1">Adjust Points</h3>
                                        <div className="flex gap-1">
                                            <input
                                                type="number"
                                                value={schoolXpEdit}
                                                onChange={(e) => setSchoolXpEdit(e.target.value)}
                                                placeholder="+/-"
                                                className="flex-1 px-2 py-1 border border-purple-300 rounded text-xs"
                                            />
                                            <button
                                                onClick={handleUpdateSchoolXp}
                                                disabled={!schoolXpEdit}
                                                className="px-2 py-1 bg-purple-500 text-white font-bold rounded text-xs hover:bg-purple-600 disabled:opacity-50"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">🏫</div>
                                        <div className="font-bold text-sm">Select a school</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Treasures Tab */}
                {activeTab === 'treasures' && (
                    <div className="h-full overflow-y-auto space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h3 className="font-bold text-lg mb-3 text-slate-800">Easter Egg Settings</h3>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-slate-600 mb-1">Enable or disable Easter egg treasures for seasonal events</p>
                                    <p className="text-xs text-slate-500">When enabled, all 8 Easter eggs will have equal spawn weight of 15 each</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newState = { ...state, easterEggsEnabled: !state.easterEggsEnabled };
                                        onUpdateState(newState);
                                        // Update weights in runtime
                                        const newWeight = !state.easterEggsEnabled ? 15 : 0;
                                        for (let i = 5; i < 13; i++) {
                                            TREASURE_TYPES[i].weight = newWeight;
                                            treasureWeights[i].weight = newWeight;
                                        }
                                        setTreasureWeights([...treasureWeights]);
                                    }}
                                    className={`px-6 py-3 font-bold rounded-lg transition-all text-white ${
                                        state.easterEggsEnabled 
                                            ? 'bg-green-500 hover:bg-green-600' 
                                            : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                >
                                    {state.easterEggsEnabled ? '✓ Eggs Enabled' : '✗ Eggs Disabled'}
                                </button>
                            </div>
                        </div>
                        
                        {/* Treasure Interval Configuration */}
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                            <h3 className="font-bold mb-3">⏱️ Redistribution Interval</h3>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    min="10"
                                    max="3600"
                                    value={treasureInterval}
                                    onChange={(e) => setTreasureInterval(e.target.value)}
                                    className="w-24 px-4 py-2 border-2 border-blue-300 rounded-lg text-center font-bold"
                                />
                                <span className="text-sm text-slate-600">seconds</span>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('treasureInterval', treasureInterval);
                                        window.location.reload(); // Reload to apply new interval
                                    }}
                                    className="ml-auto px-6 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-all"
                                >
                                    Apply & Reload
                                </button>
                            </div>
                            <div className="mt-2 text-xs text-slate-600">
                                Current: Every {Math.floor(parseInt(localStorage.getItem('treasureInterval') || '120') / 60)} minutes ({localStorage.getItem('treasureInterval') || '120'}s). 
                                Treasures are redistributed to empty desks (max 2 per classroom).
                            </div>
                        </div>

                        <div className="space-y-4">
                            {treasureWeights.map((treasure, idx) => {
                                const totalWeight = treasureWeights.reduce((sum, t) => sum + t.weight, 0);
                                const percentage = totalWeight > 0 ? ((treasure.weight / totalWeight) * 100).toFixed(1) : '0.0';
                                
                                // Get reward text for Easter eggs
                                const getEggReward = (type: string) => {
                                    if (type === 'easter_egg_1') return '1-20 coins';
                                    if (type === 'easter_egg_2') return '21-40 coins';
                                    if (type === 'easter_egg_3') return '41-50 coins';
                                    if (type === 'easter_egg_4') return 'Hall Pass';
                                    if (type === 'easter_egg_5') return 'Chocolate';
                                    if (type === 'easter_egg_6') return 'Pieces of Chocolate';
                                    if (type === 'easter_egg_7') return '100 coins + Hall Pass';
                                    if (type === 'easter_egg_8') return 'Backpack Upgrade (or 1000 coins if max)';
                                    return null;
                                };
                                
                                const eggReward = getEggReward(treasure.type);
                                
                                return (
                                    <div key={idx} className="p-4 border-2 border-slate-200 rounded-xl hover:border-amber-300 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleTreasureToggle(idx)}
                                                    className={`w-12 h-12 rounded-lg font-bold text-xl transition-all ${
                                                        treasure.weight > 0 
                                                            ? 'bg-green-500 text-white hover:bg-green-600' 
                                                            : 'bg-red-500 text-white hover:bg-red-600'
                                                    }`}
                                                >
                                                    {treasure.weight > 0 ? '✓' : '✗'}
                                                </button>
                                                <div>
                                                    <div className="font-bold text-lg capitalize">{treasure.type.replace('_', ' ')}</div>
                                                    <div className="text-sm text-slate-500">
                                                        {treasure.minAmount && treasure.maxAmount 
                                                            ? `${treasure.minAmount}-${treasure.maxAmount} coins` 
                                                            : eggReward 
                                                                ? `${ITEM_DEFINITIONS[treasure.type]?.name || 'Special Item'} - ${eggReward}`
                                                                : ITEM_DEFINITIONS[treasure.type]?.name || 'Special Item'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-amber-600">{percentage}%</div>
                                                <div className="text-xs text-slate-500">Spawn Rate</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-bold text-slate-600">Weight:</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={treasure.weight}
                                                onChange={(e) => handleWeightChange(idx, parseInt(e.target.value))}
                                                className="flex-1"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={treasure.weight}
                                                onChange={(e) => handleWeightChange(idx, parseInt(e.target.value) || 0)}
                                                className="w-20 px-3 py-1 border-2 border-slate-300 rounded-lg text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                            <div className="font-bold text-amber-800 mb-2">⚠️ Note</div>
                            <div className="text-sm text-amber-700">
                                Treasure configuration changes are temporary and will reset when the page is refreshed. 
                                To make permanent changes, modify the TREASURE_TYPES array in constants.tsx.
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

// Shop Modal Component
const ShopModal: React.FC<{ player: Player, onClose: () => void, onPurchase: (itemId: string, itemCost: number) => void }> = ({ player, onClose, onPurchase }) => {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'cost'>('cost');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Define shop items
    const shopItems = [
        { id: 'chocolate', name: 'Chocolate', cost: 100, type: 'consumable', description: '1 minute of fatigue-free cleaning', image: '/assets/treasures/chocolate.png' },
        { id: 'chocolate_pieces', name: 'Pieces of Chocolate', cost: 500, type: 'consumable', description: '5 minutes of fatigue-free cleaning', image: '/assets/treasures/chocolate_pieces.png' },
        { id: 'backpack_2', name: 'Medium Backpack', cost: 1000, type: 'backpack', level: 2, description: '20 inventory slots', image: '/assets/backpacks/medium_backpack.png' },
        { id: 'backpack_3', name: 'Large Backpack', cost: 2000, type: 'backpack', level: 3, description: '30 inventory slots', image: '/assets/backpacks/large_backpack.png' },
        { id: 'backpack_4', name: 'Hiking Backpack', cost: 5000, type: 'backpack', level: 4, description: '50 inventory slots', image: '/assets/backpacks/hiking_backpack.png' },
        { id: 'backpack_5', name: 'Nike Backpack', cost: 20000, type: 'backpack', level: 5, description: '100 inventory slots', image: '/assets/backpacks/nike_backpack.png' },
    ];

    // Filter out backpacks equal or lower than current level
    const availableItems = shopItems.filter(item => {
        if (item.type === 'backpack') {
            return (item.level || 0) > (player.backpackLevel || 1);
        }
        return true;
    });

    // Sort items
    const sortedItems = [...availableItems].sort((a, b) => {
        if (sortBy === 'name') {
            return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        } else {
            return sortOrder === 'asc' ? a.cost - b.cost : b.cost - a.cost;
        }
    });

    const selectedItemData = sortedItems.find(item => item.id === selectedItem);
    const canAfford = selectedItemData ? player.coins >= selectedItemData.cost : false;

    const handleSort = (column: 'name' | 'cost') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-white">
                    <h2 className="font-black text-4xl text-center tracking-wide">🛒 School Shopping Experience</h2>
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-slate-50 rounded-xl overflow-hidden border-2 border-slate-200">
                        {/* Table Header */}
                        <div className="bg-slate-200 grid grid-cols-[80px_1fr_150px_300px] gap-4 px-4 py-3 font-bold text-slate-700 border-b-2 border-slate-300">
                            <div>Image</div>
                            <div className="cursor-pointer hover:text-green-600 flex items-center gap-1" onClick={() => handleSort('name')}>
                                Item {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="cursor-pointer hover:text-green-600 flex items-center gap-1" onClick={() => handleSort('cost')}>
                                Cost {sortBy === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </div>
                            <div>Description</div>
                        </div>

                        {/* Table Rows */}
                        {sortedItems.map(item => (
                            <div
                                key={item.id}
                                className={`grid grid-cols-[80px_1fr_150px_300px] gap-4 px-4 py-4 border-b border-slate-200 cursor-pointer transition-all ${
                                    selectedItem === item.id 
                                        ? 'bg-green-100 border-l-4 border-l-green-600' 
                                        : 'hover:bg-slate-100'
                                }`}
                                onClick={() => setSelectedItem(item.id)}
                            >
                                <div className="flex items-center justify-center">
                                    <img src={item.image} alt={item.name} className="w-16 h-16 object-contain" />
                                </div>
                                <div className="flex items-center font-bold text-slate-800">{item.name}</div>
                                <div className="flex items-center">
                                    <span className="bg-yellow-100 px-3 py-1 rounded-full font-bold text-yellow-800 border border-yellow-300">
                                        {item.cost} 🪙
                                    </span>
                                </div>
                                <div className="flex items-center text-sm text-slate-600">{item.description}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-100 px-8 py-6 border-t-2 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">Your Coins:</span>
                                <span className="bg-yellow-100 px-4 py-2 rounded-full font-black text-yellow-800 border-2 border-yellow-300 text-xl">
                                    {player.coins} 🪙
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">Free Slots:</span>
                                <span className="bg-blue-100 px-4 py-2 rounded-full font-black text-blue-800 border-2 border-blue-300 text-xl">
                                    {player.backpackSize - player.inventory.length}
                                </span>
                            </div>
                        </div>
                        {selectedItemData && (
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-700">Cost of Item:</span>
                                <span className="bg-slate-200 px-4 py-2 rounded-full font-black text-slate-800 border-2 border-slate-300 text-xl">
                                    {selectedItemData.cost} 🪙
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-400 transition-colors"
                        >
                            Close
                        </button>
                        {canAfford && selectedItemData && (
                            <button
                                onClick={() => onPurchase(selectedItemData.id, selectedItemData.cost)}
                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors shadow-lg"
                            >
                                Purchase
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BackpackModal: React.FC<{ player: Player, onClose: () => void, onUse: (itemId: string) => void, onDelete: (itemId: string) => void }> = ({ player, onClose, onUse, onDelete }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Get current backpack info
    const currentBackpack = BACKPACK_LEVELS[player.backpackLevel || 1];

    // Group items by id and count
    let error = null;
    let itemCounts: { [id: string]: number } = {};
    let uniqueItems: string[] = [];
    try {
        player.inventory.forEach(id => {
            itemCounts[id] = (itemCounts[id] || 0) + 1;
        });
        uniqueItems = Object.keys(itemCounts);
    } catch (e) {
        error = e;
    }

    const selectedItemId = selectedIndex !== null ? uniqueItems[selectedIndex] : null;
    const selectedItem = selectedItemId ? ITEM_DEFINITIONS[selectedItemId] : null;

    const handleConsume = () => {
        if (selectedItemId) {
            onUse(selectedItemId);
            setSelectedIndex(null);
        }
    };

    const handleDelete = () => {
        if (selectedItemId) {
            onDelete(selectedItemId);
            setSelectedIndex(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-slate-800">
                {/* Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img 
                                src={currentBackpack.image} 
                                alt={currentBackpack.name}
                                className="w-16 h-16 object-contain drop-shadow-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <div>
                            <h2 className="font-marker text-2xl text-slate-800 uppercase tracking-wide">Backpack</h2>
                            <p className="text-sm font-bold text-slate-600">{currentBackpack.name}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{player.inventory.length} / {player.backpackSize} Slots</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                </div>
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-500 py-12">
                            <span className="mt-2 font-bold uppercase text-sm">Error loading backpack: {String(error)}</span>
                        </div>
                    ) : uniqueItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-12">
                            <Backpack size={48} />
                            <span className="mt-2 font-bold uppercase text-sm">Empty</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {uniqueItems.map((itemId, idx) => {
                                const item = ITEM_DEFINITIONS[itemId];
                                if (!item) return (
                                    <div key={itemId} className="p-3 rounded-2xl border-4 flex flex-col items-center gap-2 bg-red-100 text-red-600">
                                        <span className="text-xs font-bold">Unknown Item</span>
                                    </div>
                                );
                                return (
                                    <button
                                        key={itemId}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`p-3 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                                            selectedIndex === idx ? 'border-amber-500 bg-amber-50 scale-105 shadow-lg' : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-12 h-12 object-contain drop-shadow-sm"
                                                onError={(e) => { (e.target as HTMLImageElement).outerHTML = `<div class=\"text-3xl filter drop-shadow-sm\">${item.icon}</div>`; }}
                                            />
                                        ) : (
                                            <div className="text-3xl filter drop-shadow-sm">{item.icon}</div>
                                        )}
                                        <span className="text-[10px] font-black uppercase text-center leading-tight">{item.name}</span>
                                        {itemCounts[itemId] > 1 && (
                                            <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">x{itemCounts[itemId]}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer - Info Box */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    {selectedItem ? (
                        <div className="mb-4 p-4 bg-amber-50 rounded-2xl border-2 border-amber-100">
                            <div className="flex items-center gap-3 mb-3">
                                {selectedItem.image ? (
                                    <img 
                                        src={selectedItem.image} 
                                        alt={selectedItem.name}
                                        className="w-12 h-12 object-contain drop-shadow-sm"
                                        onError={(e) => { (e.target as HTMLImageElement).outerHTML = `<div class="text-4xl">${selectedItem.icon}</div>`; }}
                                    />
                                ) : (
                                    <div className="text-4xl">{selectedItem.icon}</div>
                                )}
                                <div className="flex-1">
                                    <div className="font-black text-lg text-slate-800">{selectedItem.name}</div>
                                    <div className="text-sm text-slate-600">{selectedItem.description}</div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-amber-200">
                                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Effect</div>
                                <div className="text-sm font-bold text-slate-700">
                                    {selectedItem.fatigueReduction ? `Reduces fatigue by ${formatFatigueReduction(selectedItem.fatigueReduction)}` : 
                                     selectedItemId === 'choco_3' ? 'Fatigue immunity for 60 seconds' :
                                     selectedItem.description}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4 p-4 bg-slate-100 rounded-2xl text-center text-slate-500 font-bold uppercase text-sm">
                            Select an item above to see details
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black uppercase rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            Close
                        </button>
                        <button 
                            disabled={!selectedItem}
                            onClick={handleDelete}
                            className="px-6 py-4 bg-red-500 text-white font-black uppercase rounded-xl shadow-[0_4px_0_#991b1b] active:shadow-none active:translate-y-[4px] hover:bg-red-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:bg-slate-400"
                        >
                            Delete
                        </button>
                        <button 
                            disabled={!selectedItem}
                            onClick={handleConsume}
                            className="flex-1 py-4 bg-amber-500 text-white font-black text-lg uppercase rounded-xl shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-[4px] hover:bg-amber-400 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:bg-slate-400"
                        >
                            {selectedItem ? 'Consume' : 'Select Item'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SetupWizard: React.FC<{ state: GameState, onComplete: (name: string, schoolChoice: { type: 'join', id: string }) => void }> = ({ state, onComplete }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    // Only allow entering name, then auto-assign to a random school
    return (
        <div className="w-full h-screen bg-blue-600 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-8">
                <h1 className="text-3xl font-black text-blue-900 mb-2 uppercase text-center">Welcome Student</h1>
                <p className="text-center text-slate-500 mb-8">Let's get you enrolled.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 uppercase mb-2">Your Name</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-lg"
                            placeholder="Enter name..."
                            maxLength={20}
                        />
                    </div>
                    {error && (
                        <div className="mb-4 text-red-600 font-bold text-center">{error}</div>
                    )}
                    <button
                        disabled={name.length < 3}
                        onClick={() => {
                            setError('');
                            try {
                                if (name.length < 3) {
                                    setError('Name must be at least 3 characters.');
                                    return;
                                }
                                const baseSchools = state.schools.filter(s => s.id.startsWith('school-'));
                                if (baseSchools.length === 0) {
                                    setError('No base schools available. Please contact support.');
                                    return;
                                }
                                const randomSchool = baseSchools[Math.floor(Math.random() * baseSchools.length)];
                                onComplete(name, { type: 'join', id: randomSchool.id });
                            } catch (e) {
                                setError('An unexpected error occurred. Please try again.');
                            }
                        }}
                        className="w-full py-4 bg-emerald-500 text-white font-black uppercase rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-emerald-400 transition-all mb-4"
                    >
                        Finish Enrollment
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="w-full py-2 bg-red-500 text-white font-bold uppercase rounded-xl shadow hover:bg-red-400 transition-all"
                    >
                        Reset Game (Clear Data)
                    </button>
                </div>
            </div>
        </div>
    );
};

type SortOption = 'name' | 'level' | 'clean' | 'dirty' | 'mostActive' | 'leastActive' | 'students' | 'tags';

const Explore: React.FC<{ state: GameState, onNavigate: (path: string) => void }> = ({ state, onNavigate }) => {
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    
    // Filter out player's own school
    const rivalSchools = state.schools.filter(s => s.id !== state.player.schoolId);
    
    // Handle header click for sorting
    const handleSort = (column: SortOption) => {
        if (sortBy === column) {
            setSortAsc(!sortAsc);
        } else {
            setSortBy(column);
            setSortAsc(true);
        }
        setCurrentPage(0);
    };
    
    // Sort schools based on selected option
    const sortedSchools = [...rivalSchools].sort((a, b) => {
        const cleanA = getSchoolCleanliness(a, state.activeTags);
        const cleanB = getSchoolCleanliness(b, state.activeTags);
        const activityA = state.globalLogs.filter(l => l.schoolName === a.name).length;
        const activityB = state.globalLogs.filter(l => l.schoolName === b.name).length;
        const tagsA = state.activeTags.filter(t => t.schoolId === a.id).length;
        const tagsB = state.activeTags.filter(t => t.schoolId === b.id).length;
        
        let result = 0;
        switch (sortBy) {
            case 'name': result = a.name.localeCompare(b.name); break;
            case 'level': result = a.level - b.level; break;
            case 'clean': result = cleanA - cleanB; break;
            case 'dirty': result = cleanB - cleanA; break;
            case 'mostActive': result = activityA - activityB; break;
            case 'leastActive': result = activityB - activityA; break;
            case 'students': result = a.memberIds.length - b.memberIds.length; break;
            case 'tags': result = tagsA - tagsB; break;
            default: result = 0;
        }
        return sortAsc ? result : -result;
    });
    
    // Pagination - 8 schools per page
    const itemsPerPage = 8;
    const totalPages = Math.ceil(sortedSchools.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const visibleSchools = sortedSchools.slice(startIndex, startIndex + itemsPerPage);
    
    const handlePrevPage = () => setCurrentPage(p => Math.max(0, p - 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));
    
    // Sort indicator
    const SortIndicator = ({ column }: { column: SortOption }) => (
        sortBy === column ? (
            <span className="ml-0.5">{sortAsc ? '▲' : '▼'}</span>
        ) : null
    );
    
    // Dark varsity color palette
    const varsityColors = [
        { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-500/40', accent: 'bg-red-600 text-white' },
        { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-500/40', accent: 'bg-blue-600 text-white' },
        { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-500/40', accent: 'bg-yellow-500 text-black' },
        { bg: 'bg-green-950/60', text: 'text-green-400', border: 'border-green-500/40', accent: 'bg-green-600 text-white' },
        { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/40', accent: 'bg-purple-600 text-white' },
        { bg: 'bg-indigo-950/60', text: 'text-indigo-400', border: 'border-indigo-500/40', accent: 'bg-indigo-600 text-white' },
    ];

    return (
        <div className="h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="mb-2">
                <h2 className="text-2xl font-black text-yellow-400 uppercase">Rival Schools</h2>
                <p className="text-xs text-white/60 font-bold uppercase mt-1">
                    {rivalSchools.length} schools available • Click column headers to sort
                </p>
            </div>
            
            {/* Column Headers */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-black/40 rounded-lg mb-2 text-[11px] font-black uppercase text-yellow-400 border border-yellow-500/30">
                <div onClick={() => handleSort('name')} className="w-[180px] cursor-pointer hover:text-white transition-colors">
                    School Name<SortIndicator column="name" />
                </div>
                <div onClick={() => handleSort('level')} className="w-[50px] cursor-pointer hover:text-white transition-colors text-center">
                    Level<SortIndicator column="level" />
                </div>
                <div onClick={() => handleSort('students')} className="w-[70px] cursor-pointer hover:text-white transition-colors text-center">
                    Students<SortIndicator column="students" />
                </div>
                <div className="w-[60px] text-center">Rooms</div>
                <div className="w-[70px] text-center">Points</div>
                <div onClick={() => handleSort('clean')} className="w-[60px] cursor-pointer hover:text-white transition-colors text-center">
                    Clean<SortIndicator column="clean" />
                </div>
                <div onClick={() => handleSort('tags')} className="w-[50px] cursor-pointer hover:text-white transition-colors text-center">
                    Tags<SortIndicator column="tags" />
                </div>
                <div className="flex-1 text-right pr-6">Principal</div>
            </div>

            {rivalSchools.length > 0 ? (
                <>
                    {/* Schools List - Paginated */}
                    <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                        {visibleSchools.map((school, idx) => {
                            const absoluteIdx = startIndex + idx;
                            const color = varsityColors[absoluteIdx % varsityColors.length];
                            const schoolCleanliness = getSchoolCleanliness(school, state.activeTags);

                            return (
                                <div 
                                    key={school.id}
                                    onClick={() => navigate(`/school/${school.id}`)}
                                    className={`${color.bg} border ${color.border} rounded-lg px-2 py-1.5 cursor-pointer transition-all active:scale-98 hover:shadow-md group flex-shrink-0`}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* School Name */}
                                        <div className={`${color.accent} px-2 py-1 rounded text-xs uppercase font-black w-[180px] truncate`}>
                                            {school.name}
                                        </div>

                                        {/* Level */}
                                        <div className={`${color.text} font-black text-xs w-[50px] text-center`}>
                                            {school.level}
                                        </div>

                                        {/* Students */}
                                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-white/80 w-[70px]">
                                            <Users size={14} className={color.text} />
                                            <span>{school.memberIds.length}</span>
                                        </div>

                                        {/* Rooms */}
                                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-white/80 w-[60px]">
                                            <DoorOpen size={14} className={color.text} />
                                            <span>{school.classes.length}</span>
                                        </div>

                                        {/* School Points */}
                                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-white/80 w-[70px]">
                                            <Trophy size={14} className={color.text} />
                                            <span>{school.schoolPoints.toLocaleString()}</span>
                                        </div>

                                        {/* Cleanliness */}
                                        <div className={`flex items-center justify-center gap-1 text-xs font-bold w-[60px] ${schoolCleanliness > 70 ? 'text-green-600' : schoolCleanliness > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            <Sparkles size={14} />
                                            <span>{schoolCleanliness}%</span>
                                        </div>

                                        {/* Tag Count */}
                                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-orange-600 w-[50px]">
                                            <span>{state.activeTags.filter(t => t.schoolId === school.id).length}</span>
                                        </div>

                                        {/* Principal */}
                                        <div className="text-xs font-bold text-white/70 truncate flex-1 text-right">
                                            {school.principalName}
                                        </div>

                                        {/* Arrow Indicator */}
                                        <ChevronRight size={16} className={`${color.text} opacity-40 group-hover:opacity-100 flex-shrink-0`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/20 mt-2">
                            <button 
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                                className={`w-10 h-10 rounded-full shadow border-2 flex items-center justify-center transition-all active:scale-95 font-bold ${
                                    currentPage === 0 
                                        ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed' 
                                        : 'bg-yellow-500 border-yellow-400 text-black hover:bg-yellow-400 hover:shadow-md'
                                }`}
                            >
                                <ChevronUp size={18} />
                            </button>
                            
                            <span className="font-bold text-white/80 text-xs">
                                Page {currentPage + 1} of {totalPages}
                            </span>
                            
                            <button 
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages - 1}
                                className={`w-10 h-10 rounded-full shadow border-2 flex items-center justify-center transition-all active:scale-95 font-bold ${
                                    currentPage === totalPages - 1 
                                        ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed' 
                                        : 'bg-yellow-500 border-yellow-400 text-black hover:bg-yellow-400 hover:shadow-md'
                                }`}
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <SchoolIcon size={64} className="text-white/30 mx-auto mb-4" />
                        <p className="text-white/50 font-bold text-lg">No rival schools available</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const SchoolBuildingGraphic: React.FC<{ level: number }> = ({ level }) => {
    if (level >= 15) return <Library size={64} className="text-purple-600" />;
    if (level >= 10) return <SchoolIcon size={64} className="text-indigo-600" />;
    if (level >= 5) return <SchoolIcon size={64} className="text-blue-600" />;
    return <Home size={64} className="text-emerald-600" />;
};

const SchoolView: React.FC<{ state: GameState, onNavigate: (path: string) => void, onKick: (id: string) => void, onLeave: () => void }> = ({ state, onNavigate, onKick, onLeave }) => {
    const { schoolId } = useParams();
    const navigate = useNavigate();
    const school = state.schools.find(s => s.id === schoolId);
    if (!school) return <Navigate to="/" />;
    
    const isMember = school.memberIds.includes(state.player.id);
    const [leaveConfirmStage, setLeaveConfirmStage] = useState<'idle' | 'confirm1' | 'confirm2' | 'final'>('idle');

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* School Background Graphic - Full screen */}
            <SchoolBackgroundGraphic level={school.level} schoolName={school.name} studentCount={school.memberIds.length} />

            {/* Back Button - Far left of screen */}
            <button 
                onClick={() => navigate('/explore')}
                className="absolute top-[31px] left-3 z-20 bg-amber-400 hover:bg-amber-500 text-slate-900 p-3 rounded-full shadow-lg transition-all active:scale-95 pointer-events-auto border-2 border-amber-600"
            >
                <ChevronLeft size={28} strokeWidth={3} />
            </button>

            {/* Leave Your School Button - Positioned on school image far right, only show if player is member */}
            {isMember && (
                <button
                    onClick={() => setLeaveConfirmStage('confirm1')}
                    className="absolute top-40 right-6 z-20 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-lg shadow-lg transition-all active:scale-95 border-2 border-red-800 pointer-events-auto"
                >
                    Leave Your School
                </button>
            )}

            {/* Left Side Content - Class List (overlays left portion of image) */}
            <div className="absolute top-[24%] bottom-4 left-0 w-[30%] z-10 overflow-y-auto custom-scrollbar p-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">Select Classroom</h3>
                <div className="flex flex-col gap-1.5">
                    {school.classes.map(c => {
                        const theme = getClassThemeUI(c.name);
                        const totalDesks = c.desks.length;
                        const taggedDesks = state.activeTags.filter(t => t.schoolId === school.id && t.classId === c.id).length;
                        const cleanPercent = totalDesks > 0 ? Math.round(((totalDesks - taggedDesks) / totalDesks) * 100) : 100;
                        return (
                            <div 
                                key={c.id} 
                                onClick={() => navigate(`/school/${school.id}/class/${c.id}`)}
                                className="py-1.5 px-1 cursor-pointer transition-all hover:translate-x-1 active:scale-98 flex items-center gap-2 group pointer-events-auto"
                            >
                                <div className={`${theme.accent} opacity-80`}>{theme.icon}</div>
                                <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{c.name}</span>
                                <span className={`text-xs font-bold ml-auto ${cleanPercent > 70 ? 'text-green-600' : cleanPercent > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {cleanPercent}%
                                </span>
                                <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* First Confirmation Modal - "Are you sure?" */}
            {leaveConfirmStage === 'confirm1' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-50 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Are you sure?</h2>
                            <p className="text-slate-600 font-bold mb-6">You are about to leave your school. This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setLeaveConfirmStage('idle')}
                                    className="flex-1 py-3 bg-slate-400 hover:bg-slate-500 text-white font-black uppercase rounded-xl shadow-lg transition-all active:scale-95"
                                >
                                    NO
                                </button>
                                <button
                                    onClick={() => setLeaveConfirmStage('confirm2')}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-xl shadow-lg transition-all active:scale-95"
                                >
                                    YES
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Second Confirmation Modal - "Are you REALLY sure?" */}
            {leaveConfirmStage === 'confirm2' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl p-10 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-100 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-7xl mb-6 animate-pulse">🚨</div>
                            <h2 className="text-3xl font-black text-red-900 uppercase mb-6">ARE YOU REALLY SURE?</h2>
                            <p className="text-red-800 font-black text-lg mb-8">This is your last chance to confirm!</p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setLeaveConfirmStage('confirm1')}
                                    className="py-4 px-6 bg-slate-500 hover:bg-slate-600 text-white font-black uppercase text-lg rounded-2xl shadow-xl transition-all active:scale-95 border-3 border-slate-700"
                                >
                                    NO
                                </button>
                                <button
                                    onClick={() => setLeaveConfirmStage('final')}
                                    className="py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-lg rounded-2xl shadow-xl transition-all active:scale-95 border-3 border-red-800"
                                >
                                    YES
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Message Modal */}
            {leaveConfirmStage === 'final' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-amber-100 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-6xl mb-4 animate-bounce">🔨</div>
                            <h2 className="text-3xl font-black text-amber-900 uppercase mb-4">Coming Soon!</h2>
                            <p className="text-amber-800 font-bold text-lg mb-6">LEAVING SCHOOL WILL BE ADDED</p>
                            <button
                                onClick={() => setLeaveConfirmStage('idle')}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Full Blue Notification Banner - flashes at top of screen for 5 seconds
const FullBlueNotificationBanner: React.FC<{ notifications: FullBlueNotification[] }> = ({ notifications }) => {
    if (notifications.length === 0) return null;
    
    // Show the most recent notification
    const latestNotif = notifications[notifications.length - 1];
    
    return (
        <div className="fixed top-0 left-0 right-0 z-[300] pointer-events-none">
            <div 
                className="mx-auto max-w-2xl animate-pulse"
                style={{
                    animation: 'fullBlueFlash 0.5s ease-in-out infinite alternate'
                }}
            >
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-4 px-6 shadow-2xl border-b-4 border-blue-800">
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl animate-bounce">🔵</span>
                        <div className="text-center">
                            <div className="font-black text-2xl uppercase tracking-widest drop-shadow-lg" style={{ fontFamily: 'Marker Felt, Comic Sans MS, cursive' }}>
                                FULL BLUE!
                            </div>
                            <div className="text-sm font-bold text-blue-100">
                                {latestNotif.tagCreatorName}'s tag matured • +{latestNotif.coinReward} coins
                            </div>
                            <div className="text-xs text-blue-200">
                                {latestNotif.className} @ {latestNotif.schoolName}
                            </div>
                        </div>
                        <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🔵</span>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fullBlueFlash {
                    0% { 
                        background-color: rgba(37, 99, 235, 0.95);
                        transform: scale(1);
                    }
                    100% { 
                        background-color: rgba(59, 130, 246, 0.95);
                        transform: scale(1.02);
                    }
                }
            `}</style>
        </div>
    );
};

interface FullBlueNotification {
    id: string;
    tagCreatorName: string;
    coinReward: number;
    schoolName: string;
    className: string;
    timestamp: number;
}

const LevelUpModal: React.FC<{ level: number, bonusCoins?: number, onClose: () => void }> = ({ level, bonusCoins = 0, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="text-6xl mb-4 animate-bounce">🆙</div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase mb-2">Level Up!</h2>
                    <p className="text-slate-500 font-bold text-lg mb-6">You reached Level {level}</p>
                    <div className="bg-slate-100 p-4 rounded-xl mb-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New Unlocks</div>
                        <div className="font-bold text-slate-800">New Tools & Tags Available</div>
                    </div>
                    {bonusCoins > 0 && (
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl mb-6 border-2 border-green-400">
                            <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Level Up Bonus</div>
                            <div className="text-3xl font-black text-green-600 flex items-center justify-center gap-2">
                                💰 +{bonusCoins}c
                            </div>
                        </div>
                    )}
                    <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-blue-500">
                        Awesome!
                    </button>
                </div>
            </div>
        </div>
    );
};

const SchoolLevelUpModal: React.FC<{ schoolName: string, level: number, onClose: () => void }> = ({ schoolName, level, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100 w-full max-w-md rounded-3xl p-2 text-center relative overflow-hidden shadow-2xl">
                {/* Certificate Border */}
                <div className="border-4 border-double border-amber-600 rounded-2xl p-6 relative">
                    {/* Corner Decorations */}
                    <div className="absolute top-2 left-2 text-amber-600 text-2xl">🌟</div>
                    <div className="absolute top-2 right-2 text-amber-600 text-2xl">🌟</div>
                    <div className="absolute bottom-2 left-2 text-amber-600 text-2xl">🌟</div>
                    <div className="absolute bottom-2 right-2 text-amber-600 text-2xl">🌟</div>
                    
                    {/* Certificate Header */}
                    <div className="text-amber-700 text-xs font-bold uppercase tracking-[0.3em] mb-2">Certificate of Achievement</div>
                    
                    {/* School Icon */}
                    <div className="text-6xl mb-3 animate-bounce">🏨</div>
                    
                    {/* Main Title */}
                    <h2 className="text-2xl font-black text-amber-900 uppercase mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                        School Level Up!
                    </h2>
                    
                    {/* School Name */}
                    <div className="text-xl font-black text-blue-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                        {schoolName}
                    </div>
                    
                    {/* Level Badge */}
                    <div className="inline-block bg-gradient-to-br from-amber-500 to-yellow-600 text-white px-6 py-3 rounded-full mb-4 shadow-lg">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">Now Level</div>
                        <div className="text-3xl font-black">{level}</div>
                    </div>
                    
                    {/* Congratulations Text */}
                    <p className="text-amber-800 font-bold text-sm mb-4 italic">
                        Congratulations! Your school has grown stronger through the dedication of its students.
                    </p>
                    
                    {/* Seal */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg border-2 border-amber-300">
                            <span className="text-white font-black text-xs uppercase">Official</span>
                        </div>
                    </div>
                    
                    {/* Close Button */}
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black uppercase rounded-xl shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all border-2 border-amber-600"
                    >
                        🎉 Celebrate! 🎉
                    </button>
                </div>
            </div>
        </div>
    );
};

const NameChangeModal: React.FC<{ 
    currentName: string, 
    cost: number, 
    currentSchoolName: string,
    schoolCost: number,
    isSchoolPrincipal: boolean,
    currentAvatar: string,
    playerCoins: number,
    onClose: () => void, 
    onSave: (n: string) => void,
    onSaveSchoolName: (n: string) => void,
    onSaveAvatar: (avatar: string) => void,
    onLogout: () => void 
}> = ({ currentName, cost, currentSchoolName, schoolCost, isSchoolPrincipal, currentAvatar, playerCoins, onClose, onSave, onSaveSchoolName, onSaveAvatar, onLogout }) => {
    const [newName, setNewName] = useState(currentName);
    const [newSchoolName, setNewSchoolName] = useState(currentSchoolName);
    const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    
    // Generate array of avatar filenames (265 avatars)
    const avatars = Array.from({ length: 265 }, (_, i) => `Avatar${String(i + 1).padStart(3, '0')}.png`);
    const avatarCost = 100;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Shimmer Background */}
            <style>{`
                @keyframes shimmer {
                    0% {
                        background-position: -1000px 0;
                    }
                    100% {
                        background-position: 1000px 0;
                    }
                }
                .shimmer-bg {
                    background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 25%, #06b6d4 50%, #8b5cf6 75%, #1e3a8a 100%);
                    background-size: 1000px 100%;
                    animation: shimmer 10s linear infinite;
                }
            `}</style>
            <div className="shimmer-bg absolute inset-0"></div>
            
            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 text-white">
                    <h1 className="font-black text-2xl uppercase">Player Settings</h1>
                    <p className="text-blue-100 text-sm">Customize your profile and account</p>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-6">
                    {/* SECTION 1: Player Name - Blue */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-4 border-blue-400 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-2xl">📝</div>
                            <h2 className="font-black text-lg text-blue-900 uppercase">Player Name</h2>
                        </div>
                        <p className="text-sm text-blue-700 mb-3">Change your in-game name</p>
                        <input 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full p-3 bg-white rounded-lg mb-3 font-bold border-2 border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                            maxLength={12}
                            placeholder="Enter new name"
                        />
                        <button 
                            onClick={() => onSave(newName)}
                            disabled={newName === currentName || playerCoins < cost}
                            className={`w-full py-3 font-black text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all uppercase text-sm ${
                                newName === currentName || playerCoins < cost
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 hover:shadow-xl active:scale-95'
                            }`}
                        >
                            <span>💰 Save Name</span>
                            <span className="bg-blue-800 px-2 py-1 rounded font-black">{cost}c</span>
                        </button>
                    </div>
                    
                    {/* SECTION 2: School Name - Green (or crossed out) */}
                    <div className={`rounded-2xl p-5 border-4 shadow-lg hover:shadow-xl transition-shadow ${
                        isSchoolPrincipal 
                            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400' 
                            : 'bg-gradient-to-br from-slate-100 to-slate-150 border-slate-300 opacity-60'
                    }`}>
                        <div className="flex items-center gap-2 mb-3 relative">
                            <div className="text-2xl">🏫</div>
                            <h2 className={`font-black text-lg uppercase ${isSchoolPrincipal ? 'text-green-900' : 'text-slate-500 line-through'}`}>
                                School Name
                            </h2>
                            {!isSchoolPrincipal && <span className="absolute right-0 top-0 text-xs font-black text-red-600 bg-red-100 px-2 py-1 rounded">NOT PRINCIPAL</span>}
                        </div>
                        <p className={`text-sm mb-3 ${isSchoolPrincipal ? 'text-green-700' : 'text-slate-500'}`}>
                            {isSchoolPrincipal ? 'Change your school name' : 'Only the principal can change the school name'}
                        </p>
                        <input 
                            value={newSchoolName} 
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            disabled={!isSchoolPrincipal}
                            className={`w-full p-3 rounded-lg mb-3 font-bold border-2 focus:outline-none transition-all ${
                                isSchoolPrincipal
                                    ? 'bg-white border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-400'
                                    : 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                            maxLength={30}
                            placeholder="Enter school name"
                        />
                        <button 
                            onClick={() => onSaveSchoolName(newSchoolName)}
                            disabled={!isSchoolPrincipal || newSchoolName === currentSchoolName || playerCoins < schoolCost}
                            className={`w-full py-3 font-black text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all uppercase text-sm ${
                                !isSchoolPrincipal || newSchoolName === currentSchoolName || playerCoins < schoolCost
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500 hover:shadow-xl active:scale-95'
                            }`}
                        >
                            <span>💰 Save School</span>
                            <span className="bg-green-800 px-2 py-1 rounded font-black">{schoolCost}c</span>
                        </button>
                    </div>
                    
                    {/* SECTION 3: Avatar Selection - Purple */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border-4 border-purple-400 shadow-lg hover:shadow-xl transition-shadow col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-2xl">🎭</div>
                            <h2 className="font-black text-lg text-purple-900 uppercase">Avatar Selection</h2>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">Choose from 265 unique avatars</p>
                        
                        {/* Current Avatar Preview */}
                        <div className="flex items-center gap-4 mb-4 bg-white rounded-lg p-3 border-2 border-purple-200">
                            <div className="w-20 h-20 rounded-lg overflow-hidden border-3 border-purple-400 shadow-md flex-shrink-0">
                                <img 
                                    src={`/assets/Avatars/${selectedAvatar}`} 
                                    alt="Selected Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-600 mb-2">Current Selection</p>
                                <button 
                                    onClick={() => setShowAvatarPicker(!showAvatarPicker)} 
                                    className="py-2 px-4 font-bold text-white rounded-lg bg-purple-600 hover:bg-purple-500 transition-all w-full"
                                >
                                    {showAvatarPicker ? '✕ Hide Avatars' : '+ Show Avatars'}
                                </button>
                            </div>
                        </div>
                        
                        {/* Avatar Picker Grid */}
                        {showAvatarPicker && (
                            <div className="border-2 border-purple-300 rounded-lg p-4 bg-white max-h-64 overflow-y-auto mb-4">
                                <div className="grid grid-cols-8 gap-2">
                                    {avatars.map((avatar) => (
                                        <button
                                            key={avatar}
                                            type="button"
                                            onClick={() => setSelectedAvatar(avatar)}
                                            className={`relative p-1 rounded-lg border-2 transition-all hover:scale-110 ${
                                                selectedAvatar === avatar 
                                                    ? 'border-purple-600 bg-purple-200 shadow-lg scale-110' 
                                                    : 'border-purple-200 bg-white hover:border-purple-400'
                                            }`}
                                            title={avatar}
                                        >
                                            <img 
                                                src={`/assets/Avatars/${avatar}`} 
                                                alt={avatar}
                                                className="w-full h-auto rounded"
                                            />
                                            {selectedAvatar === avatar && (
                                                <div className="absolute top-0 right-0 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
                                                    ✓
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => onSaveAvatar(selectedAvatar)}
                            disabled={playerCoins < avatarCost || selectedAvatar === currentAvatar}
                            className={`w-full py-3 font-black text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all uppercase text-sm ${
                                playerCoins < avatarCost || selectedAvatar === currentAvatar
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-500 hover:shadow-xl active:scale-95'
                            }`}
                        >
                            <span>💰 Save Avatar</span>
                            <span className="bg-purple-800 px-2 py-1 rounded font-black">{avatarCost}c</span>
                        </button>
                    </div>
                    
                    {/* SECTION 4: Exit & Logout - Red */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border-4 border-red-400 shadow-lg hover:shadow-xl transition-shadow col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-2xl">🚪</div>
                            <h2 className="font-black text-lg text-red-900 uppercase">Account</h2>
                        </div>
                        <p className="text-sm text-red-700 mb-4">Leave game or log out temporarily</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={onClose}
                                className="py-3 font-black text-slate-700 bg-white rounded-lg hover:bg-slate-100 shadow-md hover:shadow-lg transition-all border-2 border-red-300 uppercase text-sm"
                            >
                                ← Close Settings
                            </button>
                            <button 
                                onClick={onLogout}
                                className="py-3 font-black text-white bg-red-600 rounded-lg hover:bg-red-500 shadow-md hover:shadow-lg transition-all active:scale-95 uppercase text-sm"
                            >
                                🚪 Logout
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Footer with Coin Balance */}
                <div className="bg-slate-100 px-6 py-3 border-t-2 border-slate-300 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">Coins Available</p>
                    <div className="text-2xl font-black text-green-600">💰 {playerCoins}c</div>
                </div>
            </div>
        </div>
    );
};

const MessageModal: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <div className="text-6xl mb-4">🎒</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Backpack Full!</h2>
                    <p className="text-slate-600 font-bold text-base mb-6">{message}</p>
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-blue-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-blue-500 transition-all"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

    const ClassView: React.FC<{ state: GameState, onUpdateState: (s: GameState) => void, onNavigate: () => void, setShowSchoolLevelUp: (value: { schoolName: string, level: number } | null) => void }> = ({ state, onUpdateState, onNavigate, setShowSchoolLevelUp }) => {
    const { schoolId, classId } = useParams();
    const navigate = useNavigate();
    const school = state.schools.find(s => s.id === schoolId);
    const classIndex = school?.classes.findIndex(c => c.id.toString() === classId);
    const classroom = classIndex !== undefined && classIndex !== -1 ? school?.classes[classIndex] : undefined;
    if (!school || !classroom) return <Navigate to="/" />;
    const isMember = school.id === state.player.schoolId;
    const [taggingDesk, setTaggingDesk] = useState<number | null>(null);
    // Defensive: forcibly clear taggingDesk if in own school (cannot tag in own school)
    useEffect(() => {
        // Defensive: forcibly clear taggingDesk if in own school (cannot tag in own school)
        if ((isMember || school.id === state.player.schoolId) && taggingDesk !== null) {
            setTaggingDesk(null);
        }
    }, [isMember, taggingDesk, school.id, state.player.schoolId]);

    // Wrap setTaggingDesk to block in own school
    const safeSetTaggingDesk = (deskId: number) => {
        // Block in own school by any means
        if (isMember || school.id === state.player.schoolId) return;
        setTaggingDesk(deskId);
    };
    const [cleaningDesk, setCleaningDesk] = useState<number | null>(null);
    const [pendingTagOver, setPendingTagOver] = useState<number | null>(null);
    const [cleaningMessage, setCleaningMessage] = useState<string | null>(null);
    const [showBackpack, setShowBackpack] = useState(false);
    const [messageModal, setMessageModal] = useState<string | null>(null);
    // Use UI theme for the card navigation, not the background
    const themeUI = getClassThemeUI(classroom.name);

    // Navigation Helpers
    const prevClass = classIndex !== undefined && classIndex > 0 ? school.classes[classIndex - 1] : null;
    const nextClass = classIndex !== undefined && classIndex < school.classes.length - 1 ? school.classes[classIndex + 1] : null;

    // Helper to add log to BOTH global and classroom level for "Live Activity" feature
    const addLog = (newState: GameState, content: string) => {
        const newLog: BlackboardMessage = {
            id: `log-${Date.now()}-${Math.random()}`,
            senderName: state.player.name,
            content: content,
            timestamp: Date.now()
        };
        const activityLog: ActivityLog = {
            id: newLog.id,
            type: 'TAG', // simplified type
            playerName: state.player.name,
            playerAvatar: state.player.avatar || 'Avatar001.png',
            schoolName: school.name,
            content: content,
            timestamp: Date.now()
        };

        return {
            ...newState,
            globalLogs: [activityLog, ...newState.globalLogs].slice(0, 50), // Keep recent 50 global logs
            schools: newState.schools.map(s => s.id === school.id ? {
                ...s,
                classes: s.classes.map(c => c.id === classroom.id ? {
                    ...c,
                    blackboardLogs: [newLog, ...c.blackboardLogs].slice(0, 20)
                } : c)
            } : s)
        };
    };

    const handleTag = (tool: Tool, symbolIdx: number, cost: number) => {
        if (taggingDesk === null) return;
        // Final guard: block tagging in own school (strict)
        if (school.id === state.player.schoolId || isMember) return;
        const isRivalSchool = school.id !== state.player.schoolId;
        
        // CRITICAL: Use functional update to prevent race conditions
        onUpdateState(currentState => {
            console.log('=== HANDLE TAG DEBUG ===');
            console.log('Current player stats BEFORE:', currentState.player.stats);
            console.log('isRivalSchool:', isRivalSchool);
            console.log('school.id:', school.id);
            console.log('player.schoolId:', currentState.player.schoolId);
            
            const newTag: Tag = {
                id: `tag-${Date.now()}`,
                toolId: tool.id,
                creatorId: currentState.player.id,
                creatorName: currentState.player.name,
                creatorAvatar: currentState.player.avatar || 'Avatar001.png',
                startTime: Date.now(),
                durationMs: tool.maturationMs || 60000,
                schoolId: school.id,
                classId: classroom.id,
                deskId: taggingDesk,
                hardness: tool.power,
                symbol: symbolIdx,
                totalCost: cost
            };
            
            // Increment tagsPlaced for rival school tags
            let newPlayer = { ...currentState.player, coins: currentState.player.coins - cost, xp: currentState.player.xp + 5 };
            
            // Check for level up immediately after adding XP and award bonus coins
            let xpNeeded = getXpForLevel(newPlayer.level + 1);
            while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                newPlayer.level += 1;
                newPlayer.coins += 100; // Award 100 coins per level
                xpNeeded = getXpForLevel(newPlayer.level + 1);
            }
            
            if (isRivalSchool) {
                const currentTagsPlaced = currentState.player.stats?.tagsPlaced || 0;
                newPlayer.stats = { 
                    ...currentState.player.stats, 
                    tagsPlaced: currentTagsPlaced + 1,
                    tagsCleaned: currentState.player.stats?.tagsCleaned || 0,
                    treasuresFound: currentState.player.stats?.treasuresFound || 0
                };
                console.log(`Tag placed! Total tags AFTER increment: ${newPlayer.stats.tagsPlaced}`);
            } else {
                newPlayer.stats = { ...currentState.player.stats };
                console.log('NOT a rival school - stats NOT incremented');
            }
            
            let newState = {
                ...currentState,
                player: newPlayer,
                activeTags: [...currentState.activeTags, newTag],
                globalLogs: currentState.globalLogs || [],
                schools: currentState.schools || []
            };
            console.log('New state player stats:', newState.player.stats);
            console.log('=== END DEBUG ===');
            newState = addLog(newState, `Tagged Desk ${taggingDesk + 1} in ${classroom.name} at ${school.name} with ${tool.name}`);
            return newState;
        });
        
        // Save immediately to prevent tag loss from sync
        setTimeout(() => saveGame(state), 100);
        
        setTaggingDesk(null);
    };

    const handleClean = (tool: Tool) => {
        // Support both normal clean and tag-over clean
        const deskId = cleaningDesk !== null ? cleaningDesk : (pendingTagOver !== null ? pendingTagOver : null);
        if (deskId === null) return;
        const existingTag = state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === deskId);
        
        // Double-check if tag still exists (may have been cleaned by someone else)
        if (!existingTag) {
            setCleaningMessage('Tag already cleaned by another player!');
            setTimeout(() => setCleaningMessage(null), 1000);
            setCleaningDesk(null);
            setPendingTagOver(null);
            return;
        }
        
        const fatigueCost = calculateSpecificFatigue(tool.levelRequired, existingTag);
        // Check if player has fatigue immunity active
        const hasFatigueImmunity = state.player.fatigueImmunityExpires && state.player.fatigueImmunityExpires > Date.now();
        const actualFatigueCost = hasFatigueImmunity ? 0 : fatigueCost;
        const progressPercent = Math.floor(Math.min(1, (Date.now() - existingTag.startTime) / existingTag.durationMs) * 100);
        const usedChocolate = hasFatigueImmunity ? ' 🍫' : '';
        const logMessage = existingTag && existingTag.creatorId === state.player.id 
            ? `Cleaned your tag at ${progressPercent}% progress - partial rewards earned${usedChocolate}`
            : `Cleaned Desk ${deskId + 1} in ${classroom.name} at ${school.name}${usedChocolate}`;
        
        // CRITICAL: Use functional update to prevent race conditions
        onUpdateState(currentState => {
            const newFatigue = hasFatigueImmunity ? 0 : currentState.player.fatigue + actualFatigueCost;
            
            let newPlayer = { 
                ...currentState.player, 
                fatigue: newFatigue, 
                coins: currentState.player.coins - tool.cost,
                xp: currentState.player.xp + 5 // Cleaner always gets flat 5 XP
            };
            newPlayer.stats = { 
                ...currentState.player.stats, 
                tagsCleaned: (currentState.player.stats?.tagsCleaned || 0) + 1,
                tagsPlaced: currentState.player.stats?.tagsPlaced || 0,
                treasuresFound: currentState.player.stats?.treasuresFound || 0
            };
            
            // Check for level up after adding cleaner XP (use while loop to handle multiple levels)
            let xpNeeded = getXpForLevel(newPlayer.level + 1);
            while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                newPlayer.level += 1;
                newPlayer.coins += 100; // Award 100 coins per level
                xpNeeded = getXpForLevel(newPlayer.level + 1);
            }
            
            let newSchools = [...currentState.schools];
            // Calculate partial rewards for tag creator if tag exists
            if (existingTag) {
                const now = Date.now();
                const elapsed = now - existingTag.startTime;
                const progress = Math.min(1, elapsed / existingTag.durationMs);
                // Calculate rewards based on progress percentage
                const tagTool = INSTRUMENTS.find(i => i.id === existingTag.toolId);
                const fullXpReward = (tagTool?.power || 1) * 10;
                const fullCoinReward = (existingTag.totalCost || 10) * 1;
                const partialXp = Math.floor(fullXpReward * progress);
                // Coins are reduced: (progress * fullCoins) / 2
                const partialCoins = Math.floor((fullCoinReward * progress) / 2);
                const partialSchoolPoints = partialXp;
                // Award partial rewards to tag creator (find them in all schools)
                const tagOwnerSchool = newSchools.find(s => (s.members || []).some(m => m.id === existingTag.creatorId));
                if (tagOwnerSchool) {
                    const memberIdx = (tagOwnerSchool.members || []).findIndex(m => m.id === existingTag.creatorId);
                    if (memberIdx > -1) {
                        tagOwnerSchool.members[memberIdx] = {
                            ...tagOwnerSchool.members[memberIdx],
                            xp: (tagOwnerSchool.members[memberIdx].xp || 0) + partialXp,
                            reputation: (tagOwnerSchool.members[memberIdx].reputation || 0) + partialXp
                        };
                    }
                }
                // Also award to player if they are the creator
                if (existingTag.creatorId === currentState.player.id) {
                    newPlayer.xp += partialXp;
                    newPlayer.coins += partialCoins;
                    // Check for level up (use while loop to handle multiple levels) and award bonus coins
                    let xpNeeded = getXpForLevel(newPlayer.level + 1);
                    while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                        newPlayer.level += 1;
                        newPlayer.coins += 100; // Award 100 coins per level 
                        xpNeeded = getXpForLevel(newPlayer.level + 1);
                    }
                } else {
                    // Tag creator is a different player - send pending reward to backend
                    // Note: They won't get the 100-coin level-up bonus since they're not the current player
                    fetch('http://localhost:4000/api/rewards/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            playerId: existingTag.creatorId,
                            xp: partialXp,
                            coins: partialCoins,
                            reason: `Tag cleaned at ${Math.floor(progress * 100)}% maturity`
                        })
                    }).catch(err => console.error('Failed to send pending reward:', err));
                }
                // Add partial school points to the tag creator's school
                const tagSchoolIdx = newSchools.findIndex(s => s.id === tagOwnerSchool?.id);
                if (tagSchoolIdx > -1) {
                    const result = updateSchoolPointsWithLevelUp(
                        newSchools[tagSchoolIdx], 
                        partialSchoolPoints, 
                        currentState.player.id, 
                        setShowSchoolLevelUp
                    );
                    newSchools[tagSchoolIdx] = result.school;
                    if (result.leveledUp) {
                        const schoolType = getSchoolTypeName(result.newLevel);
                        const announcement: ActivityLog = {
                            id: `school-levelup-${Date.now()}-${result.school.id}`,
                            type: 'TAG',
                            playerName: 'System',
                            schoolName: result.school.name,
                            content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                            timestamp: Date.now()
                        };
                        currentState.globalLogs = [announcement, ...currentState.globalLogs].slice(0, 50);
                    }
                }
            }
            // Update schools to clear the desk and add 5 points to cleaner's school
            newSchools = newSchools.map(s => {
                if (s.id === school.id) {
                    // Add flat 5 school points for cleaning
                    const result = updateSchoolPointsWithLevelUp(
                        s, 
                        5, // Cleaner's school always gets flat 5 points
                        currentState.player.id, 
                        setShowSchoolLevelUp
                    );
                    if (result.leveledUp) {
                        const schoolType = getSchoolTypeName(result.newLevel);
                        const announcement: ActivityLog = {
                            id: `school-levelup-${Date.now()}-${result.school.id}`,
                            type: 'TAG',
                            playerName: 'System',
                            playerAvatar: getSystemAvatar(),
                            schoolName: result.school.name,
                            content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                            timestamp: Date.now()
                        };
                        currentState.globalLogs = [announcement, ...currentState.globalLogs].slice(0, 50);
                    }
                    return {
                        ...result.school,
                        classes: result.school.classes.map(c => c.id === classroom.id ? {
                            ...c,
                            desks: c.desks.map(d => d.id === deskId ? { ...d, isDirtySplodge: false } : d)
                        } : c)
                    };
                }
                return s;
            });
            let newState = {
                ...currentState,
                player: newPlayer,
                activeTags: currentState.activeTags.filter(t => t.id !== existingTag?.id),
                globalLogs: currentState.globalLogs || [],
                schools: newSchools
            };
            newState = addLog(newState, logMessage);
            return newState;
        });
        
        // Save immediately to prevent tag reappearance from sync
        setTimeout(() => saveGame(state), 100);
        
        setCleaningDesk(null);
    };

    const handleTagOver = (cleaner: Tool, weapon: Tool, symbolIdx: number) => {
        if (pendingTagOver === null) return;
        const deskId = pendingTagOver;
        
        // First check if the tag still exists
        const existingTag = state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === deskId);
        if (!existingTag) {
            setMessageModal('The tag was already cleared by another player!');
            setPendingTagOver(null);
            return;
        }

        // Calculate costs
        const cleanerCost = cleaner.cost;
        const cleanerFatigue = calculateSpecificFatigue(cleaner.levelRequired, existingTag);
        const weaponCost = weapon.cost;
        const tagCost = TAG_SYMBOLS_LIST[symbolIdx]?.cost || 0;
        const totalTagCost = weaponCost + tagCost;
        const totalCost = cleanerCost + weaponCost + tagCost;

        // Check if player has fatigue immunity active
        const hasFatigueImmunity = state.player.fatigueImmunityExpires && state.player.fatigueImmunityExpires > Date.now();
        const actualCleanerFatigue = hasFatigueImmunity ? 0 : cleanerFatigue;
        const newFatigue = hasFatigueImmunity ? 0 : state.player.fatigue + actualCleanerFatigue;

        // Start with player state
        let newPlayer = { 
            ...state.player, 
            coins: state.player.coins - totalCost,
            fatigue: newFatigue,
            xp: state.player.xp + 5 + totalTagCost // Cleaner gets flat 5 XP for cleaning, +weaponCost+tagCost for tagging
        };
        
        // Update stats for both cleaning and tagging
        newPlayer.stats = { 
            ...state.player.stats, 
            tagsCleaned: (state.player.stats?.tagsCleaned || 0) + 1,
            tagsPlaced: (state.player.stats?.tagsPlaced || 0) + 1,
            treasuresFound: state.player.stats?.treasuresFound || 0
        };

        // Check for level up (use while loop to handle multiple levels)
        let xpNeeded = getXpForLevel(newPlayer.level + 1);
        while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
            newPlayer.level += 1;
            newPlayer.coins += 100; // Award 100 coins per level
            xpNeeded = getXpForLevel(newPlayer.level + 1);
        }

        let newSchools = [...state.schools];
        
        // Calculate partial rewards for original tag creator
        const now = Date.now();
        const elapsed = now - existingTag.startTime;
        const progress = Math.min(1, elapsed / existingTag.durationMs);
        const tagTool = INSTRUMENTS.find(i => i.id === existingTag.toolId);
        const fullXpReward = (tagTool?.power || 1) * 10;
        const fullCoinReward = (existingTag.totalCost || 10) * 1;
        const partialXp = Math.floor(fullXpReward * progress);
        const partialCoins = Math.floor((fullCoinReward * progress) / 2);
        const partialSchoolPoints = partialXp;
        
        // Award partial rewards to original tag creator
        const tagOwnerSchool = newSchools.find(s => (s.members || []).some(m => m.id === existingTag.creatorId));
        if (tagOwnerSchool) {
            const memberIdx = (tagOwnerSchool.members || []).findIndex(m => m.id === existingTag.creatorId);
            if (memberIdx > -1) {
                tagOwnerSchool.members[memberIdx] = {
                    ...tagOwnerSchool.members[memberIdx],
                    xp: (tagOwnerSchool.members[memberIdx].xp || 0) + partialXp,
                    reputation: (tagOwnerSchool.members[memberIdx].reputation || 0) + partialXp
                };
            }
        }
        
        // If player is the original tag creator, add partial rewards
        if (existingTag.creatorId === state.player.id) {
            newPlayer.xp += partialXp;
            newPlayer.coins += partialCoins;
            // Check for level up (use while loop to handle multiple levels) and award bonus coins
            xpNeeded = getXpForLevel(newPlayer.level + 1);
            while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                newPlayer.level += 1;
                newPlayer.coins += 100; // Award 100 coins per level
                xpNeeded = getXpForLevel(newPlayer.level + 1);
            }
        }
        
        // Add partial school points to the school where tag was placed (victim school)
        const tagSchoolIdx = newSchools.findIndex(s => s.id === existingTag.schoolId);
        if (tagSchoolIdx > -1) {
            const result = updateSchoolPointsWithLevelUp(
                newSchools[tagSchoolIdx], 
                partialSchoolPoints, 
                state.player.id, 
                setShowSchoolLevelUp
            );
            newSchools[tagSchoolIdx] = result.school;
            if (result.leveledUp) {
                const schoolType = getSchoolTypeName(result.newLevel);
                const announcement: ActivityLog = {
                    id: `school-levelup-${Date.now()}-${result.school.id}`,
                    type: 'TAG',
                    playerName: 'System',
                    playerAvatar: getSystemAvatar(),
                    schoolName: result.school.name,
                    content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                    timestamp: Date.now()
                };
                // Will be added to newState after state creation
            }
        }
        
        // Add flat 5 school points to cleaner's school
        newSchools = newSchools.map(s => {
            if (s.id === state.player.schoolId) {
                const result = updateSchoolPointsWithLevelUp(s, 5, state.player.id, setShowSchoolLevelUp);
                if (result.leveledUp) {
                    const schoolType = getSchoolTypeName(result.newLevel);
                    const announcement: ActivityLog = {
                        id: `school-levelup-${Date.now()}-${result.school.id}`,
                        type: 'TAG',
                        playerName: 'System',
                        playerAvatar: getSystemAvatar(),
                        schoolName: result.school.name,
                        content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                        timestamp: Date.now()
                    };
                    // Will be added to newState after state creation
                }
                return result.school;
            }
            return s;
        });
        
        // Clear the desks
        newSchools = newSchools.map(s => {
            if (s.id === school.id) {
                return {
                    ...s,
                    classes: s.classes.map(c => c.id === classroom.id ? {
                        ...c,
                        desks: c.desks.map(d => d.id === deskId ? { ...d, isDirtySplodge: false } : d)
                    } : c)
                };
            }
            return s;
        });

        // Create the new tag
        const newTag: Tag = {
            id: `tag-${Date.now()}`,
            toolId: weapon.id,
            creatorId: state.player.id,
            creatorName: state.player.name,
            creatorAvatar: state.player.avatar || 'Avatar001.png',
            startTime: Date.now(),
            durationMs: weapon.maturationMs || 60000,
            schoolId: school.id,
            classId: classroom.id,
            deskId: deskId,
            hardness: weapon.power,
            symbol: symbolIdx,
            totalCost: totalTagCost
        };

        // Remove old tag and add new one
        let newState = {
            ...state,
            player: newPlayer,
            activeTags: [...state.activeTags.filter(t => t.id !== existingTag.id), newTag],
            schools: newSchools,
            globalLogs: state.globalLogs
        };
        
        const progressPercent = Math.floor(progress * 100);
        const usedChocolate = hasFatigueImmunity ? ' 🍫' : '';
        const logMessage = `Tagged over Desk ${deskId + 1} in ${classroom.name} at ${school.name} (original tag ${progressPercent}% matured)${usedChocolate}`;
        newState = addLog(newState, logMessage);
        onUpdateState(newState);
        
        // Save immediately to prevent tag-over loss from sync
        setTimeout(() => saveGame(newState), 100);
        
        setPendingTagOver(null);
    };

    const handleClaim = (deskId: number) => {
        console.log('🎁 HANDLE CLAIM called for desk:', deskId);
        
        // Pre-check: verify desk has treasure (use closure state for initial validation)
        const deskPreCheck = classroom.desks.find(d => d.id === deskId);
        console.log('🎁 Pre-check desk:', deskPreCheck);
        
        if (!deskPreCheck || !deskPreCheck.hasTreasure) {
            console.log('🎁 Pre-check FAILED: No desk or no treasure');
            return;
        }
        
        // Check if this treasure type goes in backpack (not coins)
        const isBackpackItem = deskPreCheck.treasureType !== 'coins' && deskPreCheck.treasureType !== 'coins_pile';
        
        // If it's a backpack item and backpack is full, show message and don't collect
        if (isBackpackItem && state.player.inventory.length >= state.player.backpackSize) {
            console.log('🎁 Backpack full!');
            setMessageModal('Consider upgrading to a larger backpack to carry more items!');
            return;
        }
        
        console.log('🎁 Starting functional update...');
        
        // CRITICAL: Use functional update to prevent race conditions
        onUpdateState(currentState => {
            console.log('🎁 Inside functional update, currentState:', currentState);
            
            // CRITICAL: Get fresh desk data from currentState, not closure
            const currentSchool = currentState.schools.find(s => s.id === school.id);
            const currentClassroom = currentSchool?.classes.find(c => c.id === classroom.id);
            const desk = currentClassroom?.desks.find(d => d.id === deskId);
            
            console.log('🎁 Fresh desk from currentState:', desk);
            
            // Double-check desk still has treasure
            if (!desk || !desk.hasTreasure) {
                console.log('🎁 Fresh desk check FAILED: treasure already collected');
                return currentState; // No changes
            }
            
            console.log('🎁 Collecting treasure type:', desk.treasureType);
            
            let newPlayer = { 
                ...currentState.player, 
                stats: { 
                    ...currentState.player.stats, 
                    treasuresFound: (currentState.player.stats?.treasuresFound || 0) + 1,
                    tagsPlaced: currentState.player.stats?.tagsPlaced || 0,
                    tagsCleaned: currentState.player.stats?.tagsCleaned || 0
                } 
            };
            let logMessage = '';
            
            if (desk.treasureType === 'coins') {
                // Add coins to player (single coin: 10-25) - coins don't go in backpack
                const coinAmount = desk.treasureAmount || 0;
                newPlayer.coins += coinAmount;
                logMessage = `Collected ${coinAmount} coins from Desk ${deskId + 1} in ${classroom.name} at ${school.name}`;
            } else if (desk.treasureType === 'coins_pile') {
                // Add coins to player (pile: 25-50) - coins don't go in backpack
                const coinAmount = desk.treasureAmount || 0;
                newPlayer.coins += coinAmount;
                logMessage = `Found a pile of coins worth ${coinAmount} on Desk ${deskId + 1} in ${classroom.name} at ${school.name}`;
            } else if (desk.treasureType === 'chocolate' || desk.treasureType === 'chocolate_pieces') {
                // Add chocolate item to backpack
                newPlayer.inventory = [...newPlayer.inventory, desk.treasureType];
                const itemName = desk.treasureType === 'chocolate' ? 'Chocolate' : 'Pieces of Chocolate';
                logMessage = `Found ${itemName} in Desk ${deskId + 1} in ${classroom.name} at ${school.name}`;
            } else if (desk.treasureType) {
                // Add other item to backpack
                newPlayer.inventory = [...newPlayer.inventory, desk.treasureType];
                logMessage = `Found an item in Desk ${deskId + 1} in ${classroom.name} at ${school.name}`;
            }
            
            console.log('🎁 New player coins:', newPlayer.coins, 'inventory:', newPlayer.inventory);
            
            let newState = {
                ...currentState,
                player: newPlayer,
                globalLogs: currentState.globalLogs || [],
                schools: currentState.schools.map(s => s.id === school.id ? {
                    ...s,
                    classes: s.classes.map(c => c.id === classroom.id ? {
                        ...c,
                        desks: c.desks.map(d => d.id === deskId ? { ...d, hasTreasure: false, treasureType: undefined, treasureAmount: undefined } : d)
                    } : c)
                } : s)
            };
            newState = addLog(newState, logMessage);
            
            console.log('🎁 Returning new state');
            return newState;
        });
        
        console.log('🎁 handleClaim finished');
    };
    
    const handleUseItem = (itemId: string) => {
        // CRITICAL: Use functional update to prevent race conditions
        onUpdateState(currentState => {
            let newPlayer = { ...currentState.player };
            const itemDef = ITEM_DEFINITIONS[itemId];
            
            if (itemDef?.fatigueReduction) {
                newPlayer.fatigue = Math.max(0, newPlayer.fatigue - itemDef.fatigueReduction);
            } else if (itemId === 'choco_3') {
                newPlayer.fatigueImmunityExpires = Date.now() + 60000;
            }
            
            const idx = newPlayer.inventory.indexOf(itemId);
            if (idx > -1) newPlayer.inventory.splice(idx, 1);
            
            return { ...currentState, player: newPlayer };
        });
    };

    return (
        <div className="h-full flex flex-col bg-blue-900 relative overflow-hidden">
             
             {/* Custom Classroom Background Image */}
             <CartoonClassroomBg roomName={classroom.name} classIndex={classIndex} />

             {/* Classroom Banner Header */}
             <div className="relative z-50 flex items-center justify-center pt-4 pb-8 pointer-events-none" style={{width: 'calc(70% + 60px)', marginLeft: 'calc(30% - 60px)'}}>
                      {/* Removed the back button outside the banner */}

                 <div className="w-full bg-yellow-400 border-[6px] border-blue-900 shadow-[8px_8px_0px_#1e3a8a] relative pointer-events-auto flex items-center justify-between">
                                         <button 
                                            disabled={!prevClass} 
                                            onClick={() => { onNavigate(); navigate(`/school/${schoolId}/class/${prevClass?.id}`)}}
                                            className="p-2 text-blue-900 flex items-center justify-center hover:scale-110 transition-all active:scale-95 disabled:opacity-30"
                                         >
                                             <ChevronLeft size={32} strokeWidth={4} />
                                         </button>
                     <button onClick={() => { onNavigate(); navigate(`/school/${schoolId}`); }} className="ml-2 mr-2 w-12 h-12 bg-white rounded-full shadow-lg border-4 border-blue-900 text-blue-900 flex items-center justify-center hover:scale-110 transition-transform" title={school.name}><SchoolIcon size={24}/></button>
                     <div className="flex-1 text-center py-3">
                         <h2 className="font-marker text-4xl text-blue-900 uppercase tracking-wide drop-shadow-sm leading-none">{classroom.name}</h2>
                     </div>
                     <button 
                        disabled={!nextClass} 
                        onClick={() => { onNavigate(); navigate(`/school/${schoolId}/class/${nextClass?.id}`)}}
                        className="p-2 text-blue-900 flex items-center justify-center hover:scale-110 transition-all active:scale-95 disabled:opacity-30"
                     >
                         <ChevronRight size={32} strokeWidth={4} />
                     </button>
                 </div>
             </div>
             
             <div className="flex-1 relative w-full flex flex-col overflow-visible">
                  {/* Desks container - fixed at bottom */}
                  <div className="absolute bottom-[20px] right-0 w-full flex justify-center px-8 pr-[15%] overflow-visible" style={{width: '70%', marginLeft: '30%'}}>
                      <div className="flex items-start justify-center gap-3 w-full overflow-visible">
                          {classroom.desks.map(desk => {
                              const tag = state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === desk.id);
                              const isMatured = tag && (tag.isMatured || (Date.now() - tag.startTime >= tag.durationMs));
                              const isDirty = !!desk.isDirtySplodge || !!isMatured;
                              const canClean = isMember && (!!tag || isDirty);
                              // Prevent tag over if tag belongs to a player from the same school
                              const hasFatigue = state.player.fatigue > 0;
                              let canTagOver = false;
                              if (tag && !isMember && tag.creatorId !== state.player.id && tag.schoolId !== state.player.schoolId && !hasFatigue) {
                                  const tagOwner = state.schools.flatMap(s => s.members || []).find(m => m.id === tag.creatorId);
                                  if (!tagOwner || tagOwner.schoolId !== state.player.schoolId) {
                                      canTagOver = true;
                                  }
                              }
                              // Prevent tagging own school
                              const canTagNew = !tag && !isDirty && !isMember && !desk.hasTreasure && state.player.schoolId !== school.id;

                              if (isMember) {
                                  // In own school: always show Clean button for any tag OR dirt
                                  const showCleanButton = tag || isDirty;
                                  // Debug logging
                                  console.log(`Desk ${desk.id}: isMember=${isMember}, tag=${!!tag}, isDirty=${isDirty}, showCleanButton=${showCleanButton}, hasFatigue=${hasFatigue}`);
                                  if (tag) {
                                      console.log(`Tag details:`, tag);
                                  }
                                  return (
                                      <div key={desk.id} className="flex flex-col items-center flex-1">
                                          <SchoolDesk 
                                              desk={desk} 
                                              tag={tag} 
                                              player={state.player}
                                              isOnCooldown={Date.now() - desk.lastSearched < DESK_COOLDOWN_MS}
                                              isMember={isMember}
                                              onTagClick={undefined}
                                              onCleanClick={() => setCleaningDesk(desk.id)}
                                              onClaimClick={() => handleClaim(desk.id)}
                                          />
                                          <div className="max-w-[100px] w-full mt-2 h-10 z-50">
                                              {showCleanButton ? (
                                                  <button 
                                                      disabled={hasFatigue}
                                                      onClick={() => setCleaningDesk(desk.id)} 
                                                      className={`w-full px-2 py-1 rounded transition-all active:scale-95 ${hasFatigue ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                                  >
                                                      <img src="/assets/buttons/Clean.png" alt="Clean" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : desk.hasTreasure ? (
                                                  <button onClick={() => handleClaim(desk.id)} className="w-full px-2 py-1 rounded transition-all active:scale-95 hover:scale-110 animate-pulse">
                                                      <img src="/assets/buttons/Loot.png" alt="Loot" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : (
                                                  null
                                              )}
                                          </div>
                                      </div>
                                  );
                              } else {
                                  return (
                                      <div key={desk.id} className="flex flex-col items-center flex-1">
                                          <SchoolDesk 
                                              desk={desk} 
                                              tag={tag} 
                                              player={state.player}
                                              isOnCooldown={Date.now() - desk.lastSearched < DESK_COOLDOWN_MS}
                                              isMember={isMember}
                                              onTagClick={() => safeSetTaggingDesk(desk.id)}
                                              onCleanClick={() => setCleaningDesk(desk.id)}
                                              onClaimClick={() => handleClaim(desk.id)}
                                          />
                                          <div className="max-w-[100px] w-full mt-2 h-10 z-50">
                                              {canClean ? (
                                                  <button 
                                                      disabled={hasFatigue}
                                                      onClick={() => setCleaningDesk(desk.id)} 
                                                      className={`w-full px-2 py-1 rounded transition-all active:scale-95 ${hasFatigue ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                                  >
                                                      <img src="/assets/buttons/Clean.png" alt="Clean" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : canTagOver ? (
                                                  <button 
                                                      disabled={hasFatigue}
                                                      onClick={() => setPendingTagOver(desk.id)} 
                                                      className={`w-full px-2 py-1 rounded transition-all active:scale-95 ${hasFatigue ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                                  >
                                                      <img src="/assets/buttons/TagOver.png" alt="Tag Over" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : desk.hasTreasure && !tag ? (
                                                  <button onClick={() => handleClaim(desk.id)} className="w-full px-2 py-1 rounded transition-all active:scale-95 hover:scale-110 animate-pulse">
                                                      <img src="/assets/buttons/Loot.png" alt="Loot" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : (canTagNew && !isMember) ? (
                                                  <button onClick={() => safeSetTaggingDesk(desk.id)} className="w-full px-2 py-1 rounded transition-all active:scale-95 hover:scale-110">
                                                      <img src="/assets/buttons/Tag.png" alt="Tag" className="w-full h-auto object-contain" />
                                                  </button>
                                              ) : null}
                                          </div>
                                      </div>
                                  );
                              }
                          })}
                      </div>
                  </div>
             </div>

             <Blackboard logs={classroom.blackboardLogs} />
             {/* TaggingModal can only appear in rival schools, never in own school */}
             {taggingDesk !== null && !isMember && school.id !== state.player.schoolId && (
                 <TaggingModal 
                     player={state.player}
                     schoolLevel={school.level}
                     existingTag={state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === taggingDesk)} 
                     onClose={() => setTaggingDesk(null)} 
                     onTag={handleTag} 
                 />
             )}
             {/* Tag Over Modal - shows 3-step process */}
             {pendingTagOver !== null && (() => {
                 const existingTag = state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === pendingTagOver);
                 return existingTag ? (
                     <TagOverModal 
                         player={state.player} 
                         schoolLevel={school.level}
                         existingTag={existingTag}
                         onClose={() => setPendingTagOver(null)} 
                         onTagOver={handleTagOver} 
                     />
                 ) : null;
             })()}
             {/* Cleaning Modal - only for normal cleaning */}
             {cleaningDesk !== null && (
                 <CleaningModal 
                    player={state.player} 
                    targetTag={state.activeTags.find(t => t.schoolId === school.id && t.classId === classroom.id && t.deskId === cleaningDesk)} 
                    onClose={() => setCleaningDesk(null)} 
                    onClean={(tool) => {
                        handleClean(tool);
                        setCleaningDesk(null);
                    }} 
                 />
             )}
             {showBackpack && <BackpackModal player={state.player} onClose={() => setShowBackpack(false)} onUse={handleUseItem} onDelete={handleDeleteItem} />}
             {cleaningMessage && (
                 <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[200] bg-red-500 text-white px-8 py-4 rounded-xl shadow-2xl font-black text-xl animate-bounce">
                     {cleaningMessage}
                 </div>
             )}
             {messageModal && <MessageModal message={messageModal} onClose={() => setMessageModal(null)} />}
        </div>
    );
};

function App() {
        // Admin password modal state
        const [showAdminPassword, setShowAdminPassword] = useState(false);
        const [adminPassword, setAdminPassword] = useState('');
        const [adminError, setAdminError] = useState('');
        const [adminUnlocked, setAdminUnlocked] = useState(false);

        // Multi-tab detection state
        const [isGameBlocked, setIsGameBlocked] = useState(false);
        const [blockMessage, setBlockMessage] = useState('');

        // SHA-256 hash for '43159899'
        const ADMIN_PASSWORD_HASH = 'e618c102d0071261791d07f5cda7cf5b594624a3ab145c2629261710ce6874d7';
        function handleAdminLogin() {
            const hash = sha256(adminPassword).toString(encHex);
            if (hash === ADMIN_PASSWORD_HASH) {
                setAdminUnlocked(true);
            } else {
                setAdminError('Incorrect password');
            }
        }
    // Try to load player from localStorage (login/register)
    const localPlayer = (() => {
        try {
            return JSON.parse(localStorage.getItem('player') || 'null');
        } catch {
            return null;
        }
    })();
    
    // If not logged in, show login/register immediately without initializing game state
    if (!localPlayer) {
        return (
            <HashRouter>
                <Routes>
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/*" element={<LoginPage />} />
                </Routes>
            </HashRouter>
        );
    }
    
    const [state, setState] = useState<GameState>(() => {
        try {
            const game = loadGame();
            
            // CRITICAL: NEVER load from backup during initialization - only use persistent game database
            // Backup is ONLY for emergency saves before reload, not for loading
            
            // Debug logging to track player data
            console.log('=== GAME LOAD DEBUG ===');
            console.log('Game database player:', game.player);
            console.log('LocalPlayer (identity only):', localPlayer);
            
            if (localPlayer) {
                // CRITICAL: Always load from game database ONLY - it's the source of truth
                // The game database should have the most recent saved state
                const savedPlayer = game.player && game.player.id === localPlayer.id ? game.player : null;
                
                console.log('=== PRIORITY CHECK ===');
                console.log('savedPlayer from game DB:', savedPlayer);
                
                if (savedPlayer) {
                    // Player exists in game database - USE IT DIRECTLY (highest priority)
                    game.player = {
                        ...savedPlayer,
                        // Only update identity fields from localPlayer in case they changed
                        id: localPlayer.id,
                        name: localPlayer.name,
                        schoolId: localPlayer.schoolId !== undefined ? localPlayer.schoolId : savedPlayer.schoolId,
                        lastActive: Date.now()
                    };
                    console.log('✅ Using game database player (most recent):', game.player);
                } else {
                    // No savedPlayer - this is a new player, use defaults
                    game.player = {
                        ...game.player,
                        id: localPlayer.id,
                        name: localPlayer.name,
                        schoolId: localPlayer.schoolId,
                        level: 1,
                        xp: 0,
                        coins: 0,
                        inventory: [],
                        stats: { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 },
                        backpackLevel: 1,
                        backpackSize: 10,
                        lastActive: Date.now()
                    };
                    console.log('⚠️ New player - using defaults:', game.player);
                }
                
                console.log('Final player:', game.player);
                console.log('Player level:', game.player.level, 'XP:', game.player.xp, 'Coins:', game.player.coins);
                // Sync backpack size with backpack level
                const backpackInfo = BACKPACK_LEVELS[game.player.backpackLevel || 1];
                if (backpackInfo) {
                    game.player.backpackSize = backpackInfo.slots;
                }
                // Give Bert 1000 coins on login
                if (game.player.name && game.player.name.toLowerCase() === 'bert') {
                    game.player.coins = 1000;
                }
            }
            
            // Ensure all schools have members with avatars (client-side migration)
            game.schools = game.schools.map(school => ({
                ...school,
                members: (school.members || []).map(member => ({
                    ...member,
                    avatar: member.avatar || getConsistentAvatarForId(member.id)
                }))
            }));
            
            // Ensure all activity logs have player avatars
            game.globalLogs = (game.globalLogs || []).map(log => ({
                ...log,
                playerAvatar: log.playerAvatar || getConsistentAvatarForId(log.playerName || 'unknown')
            }));
            
            return game;
        } catch (error) {
            console.error('❌ CRITICAL ERROR during game initialization:', error);
            // Clear corrupted localStorage data
            try {
                localStorage.clear();
                console.log('✅ Cleared corrupted localStorage');
            } catch (e2) {
                console.error('Failed to clear localStorage:', e2);
            }
            // Return fresh state
            return {
                player: { id: 'player-1', name: 'New_Student', level: 1, xp: 0, coins: 100, fatigue: 0, backpackSize: 10, backpackLevel: 1, inventory: [], nameChangeCost: 10, schoolId: null, cooldownUntil: 0, lastDailyTreasure: 0, lastActive: Date.now(), lastLessonAwarded: Math.floor(Date.now() / 3600000), stats: { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 }, avatar: 'Avatar001.png' },
                schools: [],
                activeTags: [],
                globalLogs: [],
                graffiti: [],
                lastTreasureReset: 0,
                easterEggsEnabled: false,
                lessonStart: Date.now()
            };
        }
    });
    const [showLevelUp, setShowLevelUp] = useState<{ level: number; bonusCoins: number } | null>(null);
    const [showNameChange, setShowNameChange] = useState(false);
    const [showGlobalBackpack, setShowGlobalBackpack] = useState(false);
    const [showGraffitiWall, setShowGraffitiWall] = useState(false);
    const [graffitiText, setGraffitiText] = useState('');
    const [showShop, setShowShop] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [backpackFullMessage, setBackpackFullMessage] = useState(false);
    const [easterEggReward, setEasterEggReward] = useState<string | null>(null);
    const [showSchoolLevelUp, setShowSchoolLevelUp] = useState<{ schoolName: string, level: number } | null>(null);
    const [fullBlueNotifications, setFullBlueNotifications] = useState<FullBlueNotification[]>([]);
    const [chocolateActivation, setChocolateActivation] = useState<{ duration: number, countdown: number } | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update current time every second to make timers count down in real-time
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Chocolate activation countdown effect
    useEffect(() => {
        if (chocolateActivation && chocolateActivation.countdown > 0) {
            const timer = setTimeout(() => {
                setChocolateActivation({ ...chocolateActivation, countdown: chocolateActivation.countdown - 1 });
            }, 1000);
            return () => clearTimeout(timer);
        } else if (chocolateActivation && chocolateActivation.countdown === 0) {
            // Close backpack and modal after countdown
            setTimeout(() => {
                setChocolateActivation(null);
                setShowGlobalBackpack(false);
            }, 500);
        }
    }, [chocolateActivation]);

    // Clean up old graffiti (older than 30 minutes) every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setState(prev => {
                const now = Date.now();
                const filteredGraffiti = prev.graffiti.filter(graf => {
                    const age = now - graf.timestamp;
                    return age < 30 * 60 * 1000; // Keep only graffiti less than 30 minutes old
                });
                
                if (filteredGraffiti.length !== prev.graffiti.length) {
                    return { ...prev, graffiti: filteredGraffiti };
                }
                return prev;
            });
        }, 60000); // Run every minute
        
        return () => clearInterval(interval);
    }, []);

    // ==========================================
    // GAME STATE MANAGEMENT & DATA INTEGRITY
    // ==========================================
    // SECURITY ARCHITECTURE:
    // 
    // 1. SINGLE SOURCE OF TRUTH: Game database (localStorage 'gameState')
    //    - All player data: level, xp, coins, inventory, fatigue, stats
    //    - All school data: levels, points, members, classes, tags
    //    - All active tags, global logs, treasure state
    //
    // 2. LOGIN IDENTITY ONLY: localStorage 'player'
    //    - Contains ONLY: id, name, schoolId
    //    - Used solely for login authentication
    //    - Never used for gameplay data (prevents manipulation)
    //
    // 3. AUTO-SAVE ON EVERY CHANGE:
    //    - useEffect monitors [state] and saves via saveGame()
    //    - Every setState call triggers immediate database save
    //    - Prevents data loss and ensures consistency
    //
    // 4. PROTECTED STATE UPDATES:
    //    - All gameplay changes go through setState()
    //    - handleUpdate() syncs player stats to school members
    //    - Tick loop (fatigue decay, maturation) saves automatically
    //    - No direct localStorage manipulation of gameplay data
    //
    // This architecture prevents:
    // - Local storage manipulation/cheating
    // - Data loss from crashes/refreshes  
    // - Desync between player and school data
    // - Stale or corrupted game state
    // ==========================================

    // Fix: define handleGlobalUseItem to prevent crash
    const handleGlobalUseItem = (itemId: string) => {
        setState(prev => {
            let newPlayer = { ...prev.player };
            const itemDef = ITEM_DEFINITIONS[itemId];
            let immunityDuration = 0;
            let rewardMessage = '';
            
            // Handle Easter Eggs
            if (itemId.startsWith('easter_egg_')) {
                const eggNum = parseInt(itemId.replace('easter_egg_', ''));
                
                // Remove the egg from inventory FIRST to free up space for rewards
                const idx = newPlayer.inventory.indexOf(itemId);
                if (idx > -1) newPlayer.inventory.splice(idx, 1);
                
                switch(eggNum) {
                    case 1: // Random 1-20 coins
                        const coins1 = Math.floor(Math.random() * 20) + 1;
                        newPlayer.coins += coins1;
                        rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received ${coins1} coins! 🪙`;
                        break;
                    case 2: // Random 21-40 coins
                        const coins2 = Math.floor(Math.random() * 20) + 21;
                        newPlayer.coins += coins2;
                        rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received ${coins2} coins! 🪙`;
                        break;
                    case 3: // Random 41-50 coins
                        const coins3 = Math.floor(Math.random() * 10) + 41;
                        newPlayer.coins += coins3;
                        rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received ${coins3} coins! 🪙`;
                        break;
                    case 4: // Hall pass
                        if (newPlayer.inventory.length < newPlayer.backpackSize) {
                            newPlayer.inventory.push('hall_pass');
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received a Hall Pass! 🟨`;
                        } else {
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched but your backpack is full! Hall Pass lost. 😢`;
                        }
                        break;
                    case 5: // Chocolate
                        if (newPlayer.inventory.length < newPlayer.backpackSize) {
                            newPlayer.inventory.push('chocolate');
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received Chocolate! 🍫`;
                        } else {
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched but your backpack is full! Chocolate lost. 😢`;
                        }
                        break;
                    case 6: // Pieces of Chocolate
                        if (newPlayer.inventory.length < newPlayer.backpackSize) {
                            newPlayer.inventory.push('chocolate_pieces');
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received Pieces of Chocolate! 🍫🍫`;
                        } else {
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched but your backpack is full! Chocolate lost. 😢`;
                        }
                        break;
                    case 7: // 100 coins + Hall Pass
                        newPlayer.coins += 100;
                        if (newPlayer.inventory.length < newPlayer.backpackSize) {
                            newPlayer.inventory.push('hall_pass');
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received 100 coins and a Hall Pass! 🪙🟨`;
                        } else {
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You received 100 coins but backpack is full - Hall Pass lost. 🪙😢`;
                        }
                        break;
                    case 8: // Backpack Upgrade or 1000 coins
                        // Check current backpack level (10=1, 20=2, 30=3, 50=4, 100=5)
                        let currentBackpackLevel = newPlayer.backpackLevel || 1;
                        
                        if (currentBackpackLevel < 5) {
                            // Upgrade to next level
                            const nextLevel = currentBackpackLevel + 1;
                            const nextBackpack = BACKPACK_LEVELS[nextLevel];
                            newPlayer.backpackSize = nextBackpack.slots;
                            newPlayer.backpackLevel = nextLevel; // Update backpack level too!
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! Your backpack upgraded to ${nextBackpack.name} (${nextBackpack.slots} slots)! 🎒✨`;
                        } else {
                            // Already max level, give 1000 coins instead
                            newPlayer.coins += 1000;
                            rewardMessage = `🥚 ${itemDef?.name || 'Easter Egg'} hatched! You already have the best backpack, so you received 1000 coins instead! 🪙🪙🪙`;
                        }
                        break;
                }
                
                // Show reward message
                if (rewardMessage) {
                    setEasterEggReward(rewardMessage);
                    setTimeout(() => setEasterEggReward(null), 3000);
                }
                
                return { ...prev, player: newPlayer };
            }
        
            // Handle fatigue reduction items (choco_1, choco_2, hall_pass)
            if (itemDef?.fatigueReduction) {
                newPlayer.fatigue = Math.max(0, newPlayer.fatigue - itemDef.fatigueReduction);
            } 
            // Handle fatigue immunity items (choco_3, chocolate, chocolate_pieces)
            else if (itemId === 'choco_3') {
                newPlayer.fatigue = 0; // Reset fatigue to zero
                immunityDuration = 60000; // 1 minute
                newPlayer.fatigueImmunityExpires = Date.now() + immunityDuration;
                setChocolateActivation({ duration: immunityDuration, countdown: 3 });
            } 
            else if (itemId === 'chocolate') {
                newPlayer.fatigue = 0; // Reset fatigue to zero
                immunityDuration = 60000; // 1 minute
                newPlayer.fatigueImmunityExpires = Date.now() + immunityDuration;
                setChocolateActivation({ duration: immunityDuration, countdown: 3 });
            } 
            else if (itemId === 'chocolate_pieces') {
                newPlayer.fatigue = 0; // Reset fatigue to zero
                immunityDuration = 300000; // 5 minutes
                newPlayer.fatigueImmunityExpires = Date.now() + immunityDuration;
                setChocolateActivation({ duration: immunityDuration, countdown: 3 });
            }
            
            const idx = newPlayer.inventory.indexOf(itemId);
            if (idx > -1) newPlayer.inventory.splice(idx, 1);
            return { ...prev, player: newPlayer };
        });
    };

    // Handle delete item from backpack
    const handleDeleteItem = (itemId: string) => {
        setState(prev => {
            let newPlayer = { ...prev.player };
            const idx = newPlayer.inventory.indexOf(itemId);
            if (idx > -1) {
                newPlayer.inventory.splice(idx, 1);
            }
            return { ...prev, player: newPlayer };
        });
    };

    // Handle graffiti wall submission
    const handleGraffitiSubmit = async () => {
        if (!graffitiText.trim()) return;
        if (graffitiText.length > 20) return;
        if (state.player.coins < 50) return;

        try {
            // Post to backend
            const response = await fetch('http://localhost:4000/api/graffiti', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: state.player.name,
                    text: graffitiText.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update local state with new graffiti and announcement
                setState(prev => {
                    const announcement: ActivityLog = {
                        id: `graffiti-announce-${Date.now()}`,
                        type: 'TAG',
                        playerName: 'System',
                        playerAvatar: getSystemAvatar(),
                        schoolName: 'Announcement',
                        content: 'ANON has graffitied the School Building',
                        timestamp: Date.now()
                    };
                    
                    return {
                        ...prev,
                        player: {
                            ...prev.player,
                            coins: prev.player.coins - 50
                        },
                        graffiti: [...prev.graffiti, data.graffiti],
                        globalLogs: [announcement, ...prev.globalLogs].slice(0, 50)
                    };
                });

                // Clear input
                setGraffitiText('');
            }
        } catch (error) {
            console.error('Failed to add graffiti:', error);
        }
    };

    // Handle shop purchases
    const handleShopPurchase = (itemId: string, itemCost: number) => {
        setState(prev => {
            let newPlayer = { ...prev.player };
        
            // Check if it's a backpack
            if (itemId.startsWith('backpack_')) {
                const newLevel = parseInt(itemId.split('_')[1]);
                newPlayer.backpackLevel = newLevel;
                const backpackInfo = BACKPACK_LEVELS[newLevel];
                if (backpackInfo) {
                    newPlayer.backpackSize = backpackInfo.slots;
                }
                newPlayer.coins -= itemCost;
                setShowShop(false);
                setPurchaseSuccess(true);
                setTimeout(() => setPurchaseSuccess(false), 1000);
                return { ...prev, player: newPlayer };
            } else {
                // Check if backpack has space
                if (newPlayer.inventory.length >= newPlayer.backpackSize) {
                    setBackpackFullMessage(true);
                    setTimeout(() => setBackpackFullMessage(false), 2000);
                    return prev; // No changes
                }
                
                // Add item to inventory
                newPlayer.inventory.push(itemId);
                newPlayer.coins -= itemCost;
                setShowShop(false);
                setPurchaseSuccess(true);
                setTimeout(() => setPurchaseSuccess(false), 1000);
                return { ...prev, player: newPlayer };
            }
        });
    };
    const distributeTreasures = (gameState: GameState): GameState => {
        const newSchools = gameState.schools.map(school => ({
            ...school,
            classes: school.classes.map(classroom => {
                // Clear all existing treasures
                let updatedDesks = classroom.desks.map(d => ({
                    ...d,
                    hasTreasure: false,
                    treasureType: undefined,
                    treasureAmount: undefined
                }));

                // Find desks with no tags (eligible for treasures)
                const eligibleDesks = updatedDesks.filter((_, idx) => {
                    const hasTag = gameState.activeTags.some(t => 
                        t.schoolId === school.id && t.classId === classroom.id && t.deskId === idx
                    );
                    return !hasTag;
                });

                if (eligibleDesks.length === 0) return { ...classroom, desks: updatedDesks };

                // Distribute up to 2 treasures per classroom
                const treasuresToPlace = Math.min(2, eligibleDesks.length);
                const selectedDesks = new Set<number>();

                for (let i = 0; i < treasuresToPlace; i++) {
                    // Pick a random eligible desk
                    let attempts = 0;
                    let deskIndex: number;
                    do {
                        const randomEligible = eligibleDesks[Math.floor(Math.random() * eligibleDesks.length)];
                        deskIndex = updatedDesks.indexOf(randomEligible);
                        attempts++;
                    } while (selectedDesks.has(deskIndex) && attempts < 20);

                    if (attempts >= 20) continue; // Safety break

                    selectedDesks.add(deskIndex);

                    // Select treasure type based on weights
                    const totalWeight = TREASURE_TYPES.reduce((sum, t) => sum + t.weight, 0);
                    if (totalWeight === 0) continue;

                    const random = Math.random() * totalWeight;
                    let cumulativeWeight = 0;
                    let selectedTreasure = TREASURE_TYPES[0];

                    for (const treasure of TREASURE_TYPES) {
                        cumulativeWeight += treasure.weight;
                        if (random <= cumulativeWeight) {
                            selectedTreasure = treasure;
                            break;
                        }
                    }

                    // Place the treasure
                    updatedDesks[deskIndex] = {
                        ...updatedDesks[deskIndex],
                        hasTreasure: true,
                        treasureType: selectedTreasure.type,
                        treasureAmount: selectedTreasure.minAmount 
                            ? Math.floor(Math.random() * (selectedTreasure.maxAmount! - selectedTreasure.minAmount + 1)) + selectedTreasure.minAmount
                            : undefined
                    };
                }

                return { ...classroom, desks: updatedDesks };
            })
        }));

        return {
            ...gameState,
            schools: newSchools,
            lastTreasureReset: Date.now()
        };
    };

    // Check and redistribute treasures periodically
    useEffect(() => {
        const checkTreasures = () => {
            const timeSinceLastReset = Date.now() - (state.lastTreasureReset || 0);
            if (timeSinceLastReset >= TREASURE_INTERVAL_MS) {
                setState(prev => distributeTreasures(prev));
            }
        };

        // Check immediately
        if (!state.lastTreasureReset || Date.now() - state.lastTreasureReset >= TREASURE_INTERVAL_MS) {
            setState(prev => distributeTreasures(prev));
        }

        // Set up interval to check
        const interval = setInterval(checkTreasures, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [state.lastTreasureReset]);

    // LESSON TIMER STATE
    const LESSON_DURATION = 60 * 60 * 1000; // 1 hour
    const REWARD_WINDOW = 60 * 1000; // 1 minute
    const MAX_REWARDS_PER_DAY = 5;
    // Use global lessonStart from state (synced with backend for all players)
    const lessonStart = state.lessonStart || Date.now();
    const [rewardAvailable, setRewardAvailable] = useState(false);
    const [rewardTimeout, setRewardTimeout] = useState(REWARD_WINDOW);
    const [rewardCollected, setRewardCollected] = useState(false);
    const [lessonRewards, setLessonRewards] = useState(() => {
        // Track reward timestamps for 24h limit
        const saved = localStorage.getItem('lessonRewards');
        return saved ? JSON.parse(saved) : [];
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!rewardAvailable) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = now - lessonStart;
                if (elapsed >= LESSON_DURATION) {
                    setRewardAvailable(true);
                    setRewardTimeout(REWARD_WINDOW);
                    setRewardCollected(false);
                }
            }, 1000);
        } else {
            // Reward window countdown
            interval = setInterval(() => {
                setRewardTimeout(prev => {
                    if (prev <= 1000) {
                        setRewardAvailable(false);
                        // Reset lesson timer globally
                        setState(s => ({ ...s, lessonStart: Date.now() }));
                        return REWARD_WINDOW;
                    }
                    return prev - 1000;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [rewardAvailable, lessonStart]);

    // Persist lessonRewards only (lessonStart is in state now)
    useEffect(() => {
        localStorage.setItem('lessonRewards', JSON.stringify(lessonRewards));
    }, [lessonRewards]);

    // Collect reward handler
    const handleCollectLessonReward = () => {
        // Check daily limit
        const now = Date.now();
        const last24h = lessonRewards.filter((t: number) => now - t < 24 * 60 * 60 * 1000);
        if (last24h.length >= MAX_REWARDS_PER_DAY) {
            setRewardCollected(true);
            return;
        }
        setState(prev => {
            // Add 100 coins to player
            let coinsToAdd = 100;
            // If Bert, ensure at least 1000 coins on first reward
            if (prev.player.name && prev.player.name.toLowerCase() === 'bert' && prev.player.coins < 1000) {
                coinsToAdd = 1000 - prev.player.coins;
            }
            const newPlayer = { ...prev.player, coins: prev.player.coins + coinsToAdd, lastLessonAwarded: Math.floor(Date.now() / 3600000) };
            // Add global log
            const log: ActivityLog = {
                id: `lesson-${now}`,
                type: 'LESSON_ATTEND',
                playerName: newPlayer.name,
                schoolName: newPlayer.schoolName,
                content: `${newPlayer.name} has attended registration and earned ${coinsToAdd} coins`,
                timestamp: now
            };
            return {
                ...prev,
                player: newPlayer,
                globalLogs: [log, ...prev.globalLogs].slice(0, 50)
            };
        });
        setLessonRewards([...last24h, now]);
        setRewardCollected(true);
        setTimeout(() => {
            // Reset lesson timer globally - janitor sweep now handled by backend every hour
            setState(prev => ({
                ...prev,
                lessonStart: Date.now()
            }));
            setRewardAvailable(false);
        }, 1000);
    };
  
  // Auto-remove Full Blue notifications after 5 seconds
  useEffect(() => {
    if (fullBlueNotifications.length === 0) return;
    
    const timer = setInterval(() => {
      const now = Date.now();
      setFullBlueNotifications(prev => 
        prev.filter(notif => now - notif.timestamp < 5000)
      );
    }, 500);
    
    return () => clearInterval(timer);
  }, [fullBlueNotifications.length]);
  
  // Save loop - Auto-save game state to database on every change for data integrity
    useEffect(() => {
        // Log important state before saving
        console.log('💾 AUTO-SAVE:', {
            level: state.player.level,
            xp: state.player.xp,
            coins: state.player.coins,
            inventoryCount: state.player.inventory.length,
            activeTagsCount: state.activeTags.length,
            timestamp: new Date().toISOString()
        });
        
        // Save to persistent game database ONLY
        saveGame(state);
        
        // Save player identity separately for login persistence (identity only, NOT game data)
        localStorage.setItem('player', JSON.stringify({
            id: state.player.id,
            name: state.player.name,
            schoolId: state.player.schoolId
        }));
        
        // Sync to backend server for multiplayer persistence
        const syncToBackend = async () => {
            try {
                // Update player data
                await fetch(`http://localhost:4000/api/player/${state.player.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state.player)
                });
                
                // Update schools
                await fetch('http://localhost:4000/api/schools', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schools: state.schools })
                });
                
                // Update game state
                await fetch('http://localhost:4000/api/gamestate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activeTags: state.activeTags,
                        globalLogs: state.globalLogs,
                        graffiti: state.graffiti,
                        lastTreasureReset: state.lastTreasureReset,
                        easterEggsEnabled: state.easterEggsEnabled,
                        lessonStart: state.lessonStart || Date.now()
                    })
                });
                
                console.log('✅ Synced to backend server (player + schools + game state)');
            } catch (error) {
                console.error('❌ Backend sync failed:', error);
            }
        };
        
        syncToBackend();
    }, [state]);
    
    // Multi-tab detection: Prevent multiple instances of the game
    useEffect(() => {
        try {
            const bc = new BroadcastChannel('game-instance');
            
            // Send message that this tab is open
            bc.postMessage({ type: 'TAB_OPENED' });
            
            // Listen for messages from other tabs
            bc.onmessage = (event) => {
                if (event.data.type === 'TAB_OPENED') {
                    // Another tab just opened the game - block this tab
                    setIsGameBlocked(true);
                    setBlockMessage('Game is already open in another tab. Please close this tab or refresh the other tab.');
                }
            };
            
            return () => {
                // Send message that this tab is closing
                bc.postMessage({ type: 'TAB_CLOSED' });
                bc.close();
            };
        } catch (error) {
            console.warn('⚠️ BroadcastChannel not supported in this browser - multi-tab detection disabled');
        }
    }, []);

    // Periodically fetch updates from backend to sync with other players
    useEffect(() => {
        const fetchUpdates = async () => {
            try {
                // Check if current player still exists in backend
                const localPlayerData = JSON.parse(localStorage.getItem('player') || 'null');
                if (localPlayerData?.id) {
                    const playerCheckRes = await fetch(`http://localhost:4000/api/user/${localPlayerData.id}`);
                    if (!playerCheckRes.ok) {
                        // Player was deleted - boot them out
                        console.warn('⚠️ Player account deleted - logging out');
                        localStorage.removeItem('player');
                        window.location.reload();
                        return;
                    }
                    
                    // Fetch player game state from backend
                    const playerStateRes = await fetch(`http://localhost:4000/api/player/${localPlayerData.id}`);
                    if (playerStateRes.ok) {
                        const backendPlayerState = await playerStateRes.json();
                        
                        // Merge backend player state with current state (backend is source of truth)
                        setState(prev => ({
                            ...prev,
                            player: {
                                ...prev.player,
                                ...backendPlayerState
                            }
                        }));
                    }
                }
                
                // Fetch schools
                const schoolsRes = await fetch('http://localhost:4000/api/schools');
                const schools = await schoolsRes.json();
                
                // Fetch game state
                const gameStateRes = await fetch('http://localhost:4000/api/gamestate');
                const gameStateData = await gameStateRes.json();
                
                // Check for pending rewards
                if (localPlayerData?.id) {
                    const rewardsRes = await fetch(`http://localhost:4000/api/rewards/${localPlayerData.id}`);
                    const rewardsData = await rewardsRes.json();
                    
                    if (rewardsData.count > 0) {
                        console.log(`💰 Claimed ${rewardsData.count} pending rewards: +${rewardsData.xp} XP, +${rewardsData.coins} coins`);
                        
                        // Apply rewards to current player
                        setState(prev => {
                            let newPlayer = {
                                ...prev.player,
                                xp: prev.player.xp + rewardsData.xp,
                                coins: prev.player.coins + rewardsData.coins
                            };
                            
                            // Check for level ups and award bonus coins
                            let xpNeeded = getXpForLevel(newPlayer.level + 1);
                            while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                                newPlayer.level += 1;
                                newPlayer.coins += 100; // Award 100 coins per level
                                xpNeeded = getXpForLevel(newPlayer.level + 1);
                            }
                            
                            return { ...prev, player: newPlayer };
                        });
                    }
                }
                
                // Client-side migration: Ensure all NPC members have avatars
                const schoolsWithAvatars = schools.map(school => ({
                    ...school,
                    members: (school.members || []).map(member => ({
                        ...member,
                        avatar: member.avatar || getConsistentAvatarForId(member.id)
                    }))
                }));
                
                // Ensure all activity logs have player avatars
                const logsWithAvatars = (gameStateData.globalLogs || []).map(log => ({
                    ...log,
                    playerAvatar: log.playerAvatar || getConsistentAvatarForId(log.playerName || 'unknown')
                }));
                
                // Update state with backend data while preserving player data
                setState(prev => ({
                    ...prev,
                    schools: schoolsWithAvatars,
                    activeTags: gameStateData.activeTags || prev.activeTags,
                    globalLogs: logsWithAvatars,
                    graffiti: gameStateData.graffiti || prev.graffiti,
                    lastTreasureReset: gameStateData.lastTreasureReset || prev.lastTreasureReset,
                    easterEggsEnabled: gameStateData.easterEggsEnabled !== undefined ? gameStateData.easterEggsEnabled : prev.easterEggsEnabled,
                    lessonStart: gameStateData.lessonStart || prev.lessonStart || Date.now()
                }));
                
                console.log('🔄 Fetched updates from backend');
            } catch (error) {
                console.error('❌ Failed to fetch backend updates:', error);
            }
        };
        
        // Fetch immediately on mount
        fetchUpdates();
        
        // Then fetch every 5 seconds to stay in sync
        const interval = setInterval(fetchUpdates, 5000);
        
        return () => clearInterval(interval);
    }, []);

    // Additional safety: Save on page unload/reload (before hot reload)
    useEffect(() => {
        const handleBeforeUnload = () => {
            console.log('🔄 PAGE RELOAD - Emergency save to persistent database!');
            saveGame(state);
            // ONLY save to main persistent database - NO backup storage
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        // Also listen for Vite's hot reload signal
        if (import.meta.hot) {
            import.meta.hot.dispose(() => {
                console.log('🔥 HOT RELOAD - Emergency save to persistent database!');
                handleBeforeUnload();
            });
        }
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [state]);

  // Watch for level changes and show level-up modal (separate from state updates to avoid race conditions)
  const prevLevelRef = useRef(state.player.level);
  const prevXpRef = useRef(state.player.xp);
  const prevInventoryRef = useRef(state.player.inventory);
  useEffect(() => {
      if (state.player.level > prevLevelRef.current) {
          const levelGain = state.player.level - prevLevelRef.current;
          const bonusCoins = levelGain * 100;
          console.log(`🎉 LEVEL UP DETECTED: ${prevLevelRef.current} → ${state.player.level} (XP: ${state.player.xp}) - Bonus: ${bonusCoins}c`);
          setShowLevelUp({ level: state.player.level, bonusCoins });
          // Explicit save after level-up detection to ensure persistence
          saveGame(state);
      } else if (state.player.level < prevLevelRef.current) {
          // Just log the regression for debugging - DO NOT auto-restore as it interferes with normal gameplay
          console.error(`🚨 LEVEL REGRESSION DETECTED: ${prevLevelRef.current} → ${state.player.level} (XP: ${state.player.xp})`, {
              currentLevel: state.player.level,
              previousLevel: prevLevelRef.current,
              currentXP: state.player.xp,
              previousXP: prevXpRef.current,
              xpNeededForNextLevel: getXpForLevel(state.player.level + 1),
              timestamp: new Date().toISOString(),
              stackTrace: new Error().stack
          });
          // NOTE: Emergency auto-restore was removed because it was causing game reloads during NPC activities
          // The auto-save system (useEffect on state changes) is sufficient for data persistence
      }
      
      // Check for inventory changes (item loss)
      if (prevInventoryRef.current.length > state.player.inventory.length) {
          const lostItems = prevInventoryRef.current.filter(item => !state.player.inventory.includes(item));
          if (lostItems.length > 0) {
              console.error(`🎒 INVENTORY LOSS DETECTED! Lost items:`, lostItems, {
                  previousInventory: prevInventoryRef.current,
                  currentInventory: state.player.inventory,
                  timestamp: new Date().toISOString(),
                  stackTrace: new Error().stack
              });
          }
      }
      
      prevLevelRef.current = state.player.level;
      prevXpRef.current = state.player.xp;
      prevInventoryRef.current = [...state.player.inventory];
  }, [state.player.level, state.player.xp, state.player.inventory]);

  // Tick loop (fatigue, maturation, treasure spawning/reset)
  useEffect(() => {
      const interval = setInterval(() => {
          setState(prev => {
              let updated = false;
              // CRITICAL: Create a reference to current player, but we'll only selectively update fields
              // to avoid overwriting inventory, xp, coins, etc. from closure-captured stale state
              let newPlayer = { ...prev.player };
              let newTags = [...prev.activeTags];
              let newSchools = [...prev.schools];
              let newGlobalLogs = [...prev.globalLogs];
              let lastTreasureReset = prev.lastTreasureReset || 0;
              
              const now = Date.now();
              const TREASURE_INTERVAL = 5 * 60 * 1000; // 5 minutes for testing

              // Fatigue decay
              if (newPlayer.fatigue > 0) {
                  newPlayer.fatigue = Math.max(0, newPlayer.fatigue - 0.7);
                  updated = true;
              }
              
              // REMOVED: Level-up catch-up logic - this was causing race conditions
              // Level-ups should ONLY happen immediately when XP is awarded in action handlers
              // (handleTag, handleClean, handleTagOver, handleGlobalUseItem, etc.)
              // DO NOT modify level or XP in the tick loop to prevent state overwrites
              
              // 5-minute treasure reset - clear all treasures and respawn (for testing)
              if (now - lastTreasureReset >= TREASURE_INTERVAL) {
                  lastTreasureReset = now;
                  updated = true;
                  
                  // Helper to pick weighted random treasure type
                  const pickTreasure = () => {
                      const totalWeight = TREASURE_TYPES.reduce((sum, t) => sum + t.weight, 0);
                      let random = Math.random() * totalWeight;
                      for (const treasure of TREASURE_TYPES) {
                          random -= treasure.weight;
                          if (random <= 0) return treasure;
                      }
                      return TREASURE_TYPES[0];
                  };
                  
                  // Reset all treasures and spawn new ones (1% chance per desk for testing)
                  newSchools = newSchools.map(school => ({
                      ...school,
                      classes: school.classes.map(cls => ({
                          ...cls,
                          desks: cls.desks.map(desk => {
                              // 1% chance for testing (0.01 probability)
                              const spawnTreasure = Math.random() < 0.01;
                              if (spawnTreasure) {
                                  const treasure = pickTreasure();
                                  if (treasure.type === 'coins' || treasure.type === 'coins_pile') {
                                      // Coin treasures give coins directly
                                      return {
                                          ...desk,
                                          hasTreasure: true,
                                          treasureType: treasure.type,
                                          treasureAmount: Math.floor(Math.random() * (treasure.maxAmount! - treasure.minAmount! + 1)) + treasure.minAmount!
                                      };
                                  } else {
                                      // Item treasures go to backpack
                                      return {
                                          ...desk,
                                          hasTreasure: true,
                                          treasureType: treasure.type,
                                          treasureAmount: undefined
                                      };
                                  }
                              }
                              return { ...desk, hasTreasure: false, treasureType: undefined, treasureAmount: undefined };
                          })
                      }))
                  }));
              }
              
              // Tag maturation check
              let tagsChanged = false;
              const newMaturedTags: { tag: Tag, coinReward: number, schoolName: string, className: string }[] = [];
              
              newTags = newTags.map(tag => {
                  if (!tag.isMatured && (now - tag.startTime >= tag.durationMs)) {
                      tagsChanged = true;
                      updated = true;
                      
                      // Identify rewards
                      const tool = INSTRUMENTS.find(i => i.id === tag.toolId);
                      const xpReward = (tool?.power || 1) * 10;
                      
                      // Reward Logic: weapon cost only
                      const coinReward = (tool?.cost || 10);
                      
                      // Find school and class names for notification
                      const tagSchool = newSchools.find(s => s.id === tag.schoolId);
                      const tagClass = tagSchool?.classes.find(c => c.id === tag.classId);
                      
                      // Track this newly matured tag for notification
                      newMaturedTags.push({
                          tag,
                          coinReward,
                          schoolName: tagSchool?.name || 'Unknown School',
                          className: tagClass?.name || 'Unknown Class'
                      });
                      
                      // Reward the tag creator (player or NPC)
                      if (tag.creatorId === newPlayer.id) {
                          // Player tag matured
                          newPlayer.xp += xpReward;
                          newPlayer.coins += coinReward; 
                          // Add to school points for the PLAYER'S school (where tag creator belongs)
                          const sIdx = newSchools.findIndex(s => s.id === newPlayer.schoolId);
                          if (sIdx > -1) {
                              const result = updateSchoolPointsWithLevelUp(
                                  newSchools[sIdx], 
                                  xpReward, 
                                  newPlayer.id, 
                                  setShowSchoolLevelUp
                              );
                              newSchools[sIdx] = result.school;
                              if (result.leveledUp) {
                                  const schoolType = getSchoolTypeName(result.newLevel);
                                  const announcement: ActivityLog = {
                                      id: `school-levelup-${Date.now()}-${result.school.id}`,
                                      type: 'TAG',
                                      playerName: 'System',
                                      playerAvatar: getSystemAvatar(),
                                      schoolName: result.school.name,
                                      content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                                      timestamp: Date.now()
                                  };
                                  newGlobalLogs = [announcement, ...newGlobalLogs].slice(0, 50);
                              }
                          }
                          
                          // Check for level up (use while loop to handle multiple levels) and award bonus coins
                          let xpNeeded = getXpForLevel(newPlayer.level + 1);
                          while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                              newPlayer.level += 1;
                              newPlayer.coins += 100; // Award 100 coins per level
                              xpNeeded = getXpForLevel(newPlayer.level + 1);
                          }
                      } else {
                          // NPC tag matured - award them rewards too!
                          // Find the NPC's school
                          const npcSchool = newSchools.find(s => (s.members || []).some(m => m.id === tag.creatorId));
                          if (npcSchool) {
                              const schoolIdx = newSchools.findIndex(s => s.id === npcSchool.id);
                              const npcMemberIdx = npcSchool.members?.findIndex(m => m.id === tag.creatorId);
                              
                              if (schoolIdx > -1 && npcMemberIdx !== undefined && npcMemberIdx > -1 && newSchools[schoolIdx].members) {
                                  // Update NPC reputation and level
                                  newSchools[schoolIdx] = {
                                      ...newSchools[schoolIdx],
                                      members: newSchools[schoolIdx].members!.map((m, idx) => {
                                          if (idx === npcMemberIdx) {
                                              const newReputation = (m.reputation || 0) + xpReward;
                                              const newLevel = m.level + (newReputation >= getXpForLevel(m.level + 1) ? 1 : 0);
                                              return {
                                                  ...m,
                                                  reputation: newReputation,
                                                  level: newLevel,
                                                  stats: {
                                                      tagsPlaced: (m.stats?.tagsPlaced || 0),
                                                      tagsCleaned: (m.stats?.tagsCleaned || 0),
                                                      treasuresFound: (m.stats?.treasuresFound || 0)
                                                  }
                                              };
                                          }
                                          return m;
                                      })
                                  };
                              }
                              
                              // Add school points for the NPC's school (where NPC belongs)
                              const sIdx = newSchools.findIndex(s => s.id === npcSchool.id);
                              if (sIdx > -1) {
                                  const result = updateSchoolPointsWithLevelUp(
                                      newSchools[sIdx], 
                                      xpReward, 
                                      null, 
                                      setShowSchoolLevelUp
                                  );
                                  newSchools[sIdx] = result.school;
                                  if (result.leveledUp) {
                                      const schoolType = getSchoolTypeName(result.newLevel);
                                      const announcement: ActivityLog = {
                                          id: `school-levelup-${Date.now()}-${result.school.id}`,
                                          type: 'TAG',
                                          playerName: 'System',
                                          playerAvatar: getSystemAvatar(),
                                          schoolName: result.school.name,
                                          content: `${result.school.name} has leveled up to ${schoolType} (Level ${result.newLevel})!`,
                                          timestamp: Date.now()
                                      };
                                      newGlobalLogs = [announcement, ...newGlobalLogs].slice(0, 50);
                                  }
                              }
                          }
                      }
                      
                      return { ...tag, isMatured: true };
                  }
                  return tag;
              });
              
              // Add activity logs for newly matured tags
              if (newMaturedTags.length > 0) {
                  newMaturedTags.forEach(({ tag, coinReward, schoolName, className }) => {
                      const tool = INSTRUMENTS.find(i => i.id === tag.toolId);
                      const xpReward = (tool?.power || 1) * 10;
                      
                      const activityLog: ActivityLog = {
                          id: `fullblue-${Date.now()}-${Math.random()}`,
                          type: 'FULL_BLUE',
                          playerName: tag.creatorName,
                          playerAvatar: tag.creatorAvatar,
                          schoolName: schoolName,
                          content: `FULL BLUE! ${tag.creatorName}'s tag matured - earned ${xpReward} XP`,
                          timestamp: Date.now()
                      };
                      
                      // Add to global logs
                      prev.globalLogs = [activityLog, ...prev.globalLogs].slice(0, 50);
                      
                      // Add to classroom blackboard logs
                      const sIdx = newSchools.findIndex(s => s.id === tag.schoolId);
                      if (sIdx > -1) {
                          const cIdx = newSchools[sIdx].classes.findIndex(c => c.id === tag.classId);
                          if (cIdx > -1) {
                              const blackboardLog: BlackboardMessage = {
                                  id: activityLog.id,
                                  senderName: tag.creatorName,
                                  content: `🔵 FULL BLUE! Earned ${xpReward} XP`,
                                  timestamp: Date.now()
                              };
                              newSchools[sIdx] = {
                                  ...newSchools[sIdx],
                                  classes: newSchools[sIdx].classes.map((c, idx) => 
                                      idx === cIdx ? { ...c, blackboardLogs: [blackboardLog, ...c.blackboardLogs].slice(0, 20) } : c
                                  )
                              };
                          }
                      }
                  });
                  
                  // Trigger Full Blue notifications - only for player's own tags
                  const playerMaturedTags = newMaturedTags.filter(({ tag }) => tag.creatorId === newPlayer.id);
                  if (playerMaturedTags.length > 0) {
                      setFullBlueNotifications(prevNotifs => [
                          ...prevNotifs,
                          ...playerMaturedTags.map(({ tag, coinReward, schoolName, className }) => ({
                              id: `notif-${tag.id}-${Date.now()}`,
                              tagCreatorName: tag.creatorName,
                              coinReward,
                              schoolName,
                              className,
                              timestamp: Date.now()
                          }))
                      ]);
                  }
              }
              
              // CRITICAL: Only update fields that actually changed to avoid overwriting fresh player data
              // If tags matured, XP/coins were modified, so preserve those changes
              // Always preserve inventory, stats, backpack fields from prev.player to prevent item loss!
              if (tagsChanged) {
                  return { 
                      ...prev, 
                      player: {
                          ...prev.player, // Start with current player data
                          xp: newPlayer.xp, // Update XP from maturation
                          coins: newPlayer.coins, // Update coins from maturation
                          level: newPlayer.level, // Update level if leveled up
                          fatigue: newPlayer.fatigue // Update fatigue
                          // inventory, stats, backpackLevel, backpackSize all preserved from prev.player
                      },
                      activeTags: newTags, 
                      schools: newSchools,
                      globalLogs: newGlobalLogs,
                      lastTreasureReset 
                  };
              }
              
              if (updated) {
                  return { 
                      ...prev, 
                      player: { ...prev.player, fatigue: newPlayer.fatigue }, // Only fatigue changed
                      schools: newSchools,
                      globalLogs: newGlobalLogs,
                      lastTreasureReset 
                  };
              }
              
              return prev;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // NPC Activity Loop - NPCs tag rival schools and clean their own school every 60 seconds
  useEffect(() => {
      const npcInterval = setInterval(() => {
          setState(prev => {
              let newTags = [...prev.activeTags];
              let newSchools = [...prev.schools];
              let newGlobalLogs = [...prev.globalLogs];
              let newPlayer = prev.player; // Track if player needs updates
              let playerUpdated = false;
              let updated = false;
              
              // For each school, have random NPCs perform actions
              newSchools.forEach((school, schoolIdx) => {
                  const npcMembers = school.members?.filter(m => typeof m === 'object' && m !== null && typeof m.id === 'string' && m.id.startsWith('npc-')) || [];
                  if (npcMembers.length === 0) return;
                  
                  // Pick 1-3 random NPCs to act
                  const activeNpcCount = Math.floor(Math.random() * 3) + 1;
                  const shuffledNpcs = [...npcMembers].sort(() => Math.random() - 0.5).slice(0, activeNpcCount);
                  
                  shuffledNpcs.forEach(npc => {
                      const action = Math.random();
                      
                      if (action < 0.6) {
                          // 60% chance: Tag a rival school
                          const rivalSchools = newSchools.filter(s => s.id !== school.id);
                          if (rivalSchools.length === 0) return;
                          
                          const targetSchool = rivalSchools[Math.floor(Math.random() * rivalSchools.length)];
                          const targetSchoolIdx = newSchools.findIndex(s => s.id === targetSchool.id);
                          const targetClass = targetSchool.classes[Math.floor(Math.random() * targetSchool.classes.length)];
                          const targetDesk = targetClass.desks[Math.floor(Math.random() * targetClass.desks.length)];
                          
                          // Check if desk already has a tag
                          const existingTag = newTags.find(t => 
                              t.schoolId === targetSchool.id && 
                              t.classId === targetClass.id && 
                              t.deskId === targetDesk.id
                          );
                          
                          if (!existingTag && !targetDesk.isDirtySplodge) {
                              // Pick a random tool based on NPC level AND target school level
                              const availableTools = INSTRUMENTS.filter(t => 
                                  npc.level >= t.levelRequired && 
                                  t.levelRequired <= targetSchool.level
                              );
                              const tool = availableTools[Math.floor(Math.random() * availableTools.length)] || INSTRUMENTS[0];
                              
                              const newTag: Tag = {
                                  id: `npc-tag-${Date.now()}-${Math.random()}`,
                                  toolId: tool.id,
                                  creatorId: npc.id,
                                  creatorName: npc.name,
                                  creatorAvatar: npc.avatar || getConsistentAvatarForId(npc.id),
                                  startTime: Date.now(),
                                  durationMs: tool.maturationMs || 60000,
                                  schoolId: targetSchool.id,
                                  classId: targetClass.id,
                                  deskId: targetDesk.id,
                                  hardness: tool.power,
                                  symbol: Math.floor(Math.random() * 12),
                                  totalCost: tool.cost + 5
                              };
                              
                              newTags.push(newTag);
                              updated = true;
                              
                              // Update NPC stats for tagging
                              const npcMemberIdx = newSchools[schoolIdx].members?.findIndex(m => m.id === npc.id);
                              if (npcMemberIdx !== undefined && npcMemberIdx > -1 && newSchools[schoolIdx].members) {
                                  const currentNpc = newSchools[schoolIdx].members![npcMemberIdx];
                                  newSchools[schoolIdx] = {
                                      ...newSchools[schoolIdx],
                                      members: newSchools[schoolIdx].members!.map((m, idx) => 
                                          idx === npcMemberIdx ? {
                                              ...m,
                                              reputation: (m.reputation || 0) + 5,
                                              stats: {
                                                  tagsPlaced: ((m.stats?.tagsPlaced || 0) + 1),
                                                  tagsCleaned: (m.stats?.tagsCleaned || 0),
                                                  treasuresFound: (m.stats?.treasuresFound || 0)
                                              }
                                          } : m
                                      )
                                  };
                              }
                              
                              // Add to target school's classroom logs
                              const classIdx = newSchools[targetSchoolIdx].classes.findIndex(c => c.id === targetClass.id);
                              if (classIdx > -1) {
                                  const blackboardLog: BlackboardMessage = {
                                      id: `npc-log-${Date.now()}-${Math.random()}`,
                                      senderName: npc.name,
                                      content: `${npc.name} from ${school.name} tagged Desk ${targetDesk.id + 1}!`,
                                      timestamp: Date.now()
                                  };
                                  newSchools[targetSchoolIdx] = {
                                      ...newSchools[targetSchoolIdx],
                                      classes: newSchools[targetSchoolIdx].classes.map((c, idx) => 
                                          idx === classIdx ? { ...c, blackboardLogs: [blackboardLog, ...c.blackboardLogs].slice(0, 20) } : c
                                      )
                                  };
                              }
                              
                              // Add to global logs
                              const activityLog: ActivityLog = {
                                  id: `npc-activity-${Date.now()}-${Math.random()}`,
                                  type: 'TAG',
                                  playerName: npc.name,
                                  schoolName: targetSchool.name,
                                  content: `${npc.name} tagged ${targetClass.name} at ${targetSchool.name}`,
                                  timestamp: Date.now()
                              };
                              newGlobalLogs = [activityLog, ...newGlobalLogs].slice(0, 50);
                          }
                      } else {
                          // 40% chance: Clean own school
                          const ownSchoolIdx = schoolIdx;
                          const ownClass = school.classes[Math.floor(Math.random() * school.classes.length)];
                          const classIdx = newSchools[ownSchoolIdx].classes.findIndex(c => c.id === ownClass.id);
                          
                          // Find a tag to clean in this class
                          const tagToClean = newTags.find(t => 
                              t.schoolId === school.id && 
                              t.classId === ownClass.id &&
                              t.creatorId !== npc.id // Don't clean own tags
                          );
                          
                          if (tagToClean) {
                              // Calculate partial rewards for tag creator (could be player or another NPC)
                              const now = Date.now();
                              const elapsed = now - tagToClean.startTime;
                              const progress = Math.min(1, elapsed / tagToClean.durationMs);
                              const tagTool = INSTRUMENTS.find(i => i.id === tagToClean.toolId);
                              const fullXpReward = (tagTool?.power || 1) * 10;
                              const fullCoinReward = (tagToClean.totalCost || 10) * 1;
                              const partialXp = Math.floor(fullXpReward * progress);
                              const partialCoins = Math.floor((fullCoinReward * progress) / 2);
                              
                              // Remove the tag
                              newTags = newTags.filter(t => t.id !== tagToClean.id);
                              updated = true;
                              
                              // Award partial rewards to tag creator
                              if (tagToClean.creatorId === prev.player.id) {
                                  // Player's tag was cleaned - give them partial rewards
                                  newPlayer = {
                                      ...prev.player,
                                      xp: prev.player.xp + partialXp,
                                      coins: prev.player.coins + partialCoins
                                  };
                                  
                                  // Check for level up and award bonus coins
                                  let xpNeeded = getXpForLevel(newPlayer.level + 1);
                                  while (newPlayer.xp >= xpNeeded && xpNeeded > 0) {
                                      newPlayer.level += 1;
                                      newPlayer.coins += 100; // Award 100 coins per level
                                      xpNeeded = getXpForLevel(newPlayer.level + 1);
                                  }
                                  
                                  playerUpdated = true;
                              }
                              
                              // Calculate school points and check for level up
                              const oldLevel = newSchools[ownSchoolIdx].level;
                              const newPoints = newSchools[ownSchoolIdx].schoolPoints + 5;
                              const pointsNeededForNextLevel = getPointsForSchoolLevel(oldLevel + 1);
                              const shouldLevelUp = newPoints >= pointsNeededForNextLevel;
                              const newLevel = shouldLevelUp ? oldLevel + 1 : oldLevel;
                              
                              // Update NPC stats for cleaning
                              const npcMemberIdx = newSchools[ownSchoolIdx].members?.findIndex(m => m.id === npc.id);
                              if (npcMemberIdx !== undefined && npcMemberIdx > -1 && newSchools[ownSchoolIdx].members) {
                                  let updatedSchool = {
                                      ...newSchools[ownSchoolIdx],
                                      schoolPoints: newPoints,
                                      level: newLevel,
                                      members: newSchools[ownSchoolIdx].members!.map((m, idx) => 
                                          idx === npcMemberIdx ? {
                                              ...m,
                                              reputation: (m.reputation || 0) + 3,
                                              stats: {
                                                  tagsPlaced: (m.stats?.tagsPlaced || 0),
                                                  tagsCleaned: ((m.stats?.tagsCleaned || 0) + 1),
                                                  treasuresFound: (m.stats?.treasuresFound || 0)
                                              }
                                          } : m
                                      )
                                  };
                                  
                                  // Add new classrooms if leveled up
                                  if (shouldLevelUp) {
                                      updatedSchool = addClassroomsForLevel(updatedSchool, newLevel);
                                  }
                                  
                                  newSchools[ownSchoolIdx] = updatedSchool;
                              }
                              
                              // Add to global logs
                              const activityLog: ActivityLog = {
                                  id: `npc-clean-${Date.now()}-${Math.random()}`,
                                  type: 'CLEAN',
                                  playerName: npc.name,
                                  playerAvatar: getConsistentAvatarForId(npc.id),
                                  schoolName: school.name,
                                  content: `${npc.name} cleaned a tag in ${ownClass.name} at ${school.name}`,
                                  timestamp: Date.now()
                              };
                              newGlobalLogs = [activityLog, ...newGlobalLogs].slice(0, 50);
                              
                              // Update total cleans
                              newSchools[ownSchoolIdx] = {
                                  ...newSchools[ownSchoolIdx],
                                  totalCleans: newSchools[ownSchoolIdx].totalCleans + 1
                              };
                          }
                      }
                  });
              });
              
              // CRITICAL: Return updated state properly - NEVER overwrite player with old reference!
              // If NPCs cleaned a player tag, merge updated fields into CURRENT prev.player
              if (updated) {
                  if (playerUpdated) {
                      // CRITICAL: Merge only the updated fields into the current prev.player
                      // NEVER assign newPlayer directly as it's a stale reference!
                      return { 
                          ...prev, 
                          player: {
                              ...prev.player, // Use CURRENT player as base
                              xp: newPlayer.xp, // Update XP
                              coins: newPlayer.coins, // Update coins
                              level: newPlayer.level // Update level if changed
                              // All other fields (inventory, stats, etc.) preserved from prev.player
                          },
                          activeTags: newTags, 
                          schools: newSchools, 
                          globalLogs: newGlobalLogs 
                      };
                  } else {
                      // Player not updated - don't touch player object at all
                      return { 
                          ...prev, 
                          activeTags: newTags, 
                          schools: newSchools, 
                          globalLogs: newGlobalLogs 
                      };
                  }
              }
              return prev;
          });
      }, 60000); // Every 60 seconds
      
      return () => clearInterval(npcInterval);
  }, []);

  const handleSetup = (name: string, schoolChoice: { type: 'join' | 'create', id?: string, name?: string }) => {
      let newSchools = [...state.schools];
      let newSchoolId = '';
      const newPlayer = { ...state.player, name: name };

      if (schoolChoice.type === 'create' && schoolChoice.name) {
          const newId = `s-${Date.now()}`;
          const newSchool = generateSchool(newId, schoolChoice.name, 1, true);
          newSchool.principalId = newPlayer.id;
          newSchool.principalName = newPlayer.name;
          newSchool.memberIds = [newPlayer.id];
          newSchool.members = [{
              id: newPlayer.id,
              name: newPlayer.name,
              level: newPlayer.level,
              reputation: newPlayer.xp,
              lastActive: Date.now()
          }];
          newSchools.push(newSchool);
          newSchoolId = newId;
      } else if (schoolChoice.type === 'join' && schoolChoice.id) {
          newSchoolId = schoolChoice.id;
          newSchools = newSchools.map(s => {
              if (s.id === newSchoolId) {
                  return {
                      ...s,
                      memberIds: [...s.memberIds, newPlayer.id],
                      members: [...(s.members || []), {
                          id: newPlayer.id,
                          name: newPlayer.name,
                          level: newPlayer.level,
                          reputation: newPlayer.xp,
                          lastActive: Date.now()
                      }]
                  };
              }
              return s;
          });
      }

      const updatedPlayer = { ...newPlayer, schoolId: newSchoolId };
      const updatedState = {
          ...state,
          schools: newSchools,
          player: updatedPlayer
      };
      setState(updatedState);
      saveGame(updatedState);
      // Save only identity info for login
      localStorage.setItem('player', JSON.stringify({
          id: updatedPlayer.id,
          name: updatedPlayer.name,
          schoolId: updatedPlayer.schoolId
      }));
      setTimeout(() => {
          window.location.hash = '#/';
          window.location.reload();
      }, 100);
  };
  
  // CRITICAL: Use this for all state updates to prevent race conditions!
  // This function takes an updater function that receives current state and returns new state
  const handleUpdate = (updaterOrState: GameState | ((prevState: GameState) => GameState)) => {
      // CRITICAL: ALWAYS use functional setState to prevent race conditions
      
      setState(prev => {
          // If updaterOrState is a function, call it with prev to get newState
          // If it's already a state object, use it directly (legacy support)
          const newState = typeof updaterOrState === 'function' ? updaterOrState(prev) : updaterOrState;
          
          // CRITICAL: Build the update based on CURRENT prev state
          let updatedState = {
              ...prev,
              // Merge all changes from newState
              player: newState.player,
              activeTags: newState.activeTags,
              schools: newState.schools,
              globalLogs: newState.globalLogs,
              lastTreasureReset: newState.lastTreasureReset
          };
          
          // Sync player stats to their school's members array
          if (updatedState.player.schoolId) {
              updatedState.schools = updatedState.schools.map(s => {
                  if (s.id === updatedState.player.schoolId && s.members) {
                      return {
                          ...s,
                          members: s.members.map(m => 
                              m.id === updatedState.player.id 
                                  ? {
                                      ...m,
                                      name: updatedState.player.name,
                                      level: updatedState.player.level,
                                      reputation: updatedState.player.xp,
                                      lastActive: Date.now(),
                                      stats: updatedState.player.stats
                                  }
                                  : m
                          )
                      };
                  }
                  return s;
              });
          }
          
          // Check if player's school leveled up (compare against prev, not closure state)
          const oldPlayerSchool = prev.schools.find(s => s.id === prev.player.schoolId);
          const newPlayerSchool = updatedState.schools.find(s => s.id === updatedState.player.schoolId);
          
          if (oldPlayerSchool && newPlayerSchool && newPlayerSchool.level > oldPlayerSchool.level) {
              setShowSchoolLevelUp({ schoolName: newPlayerSchool.name, level: newPlayerSchool.level });
          }
          
          // Also check for player level up (compare against prev, not closure state)
          if (updatedState.player.level > prev.player.level) {
              const levelGain = updatedState.player.level - prev.player.level;
              const bonusCoins = levelGain * 100;
              setShowLevelUp({ level: updatedState.player.level, bonusCoins });
          }
          
          return updatedState;
      });
      // Note: saveGame is handled by auto-save useEffect, no need to call explicitly
  };


    // Check if player needs to complete setup (choose school)
    if (!state.player.schoolId) {
            return (
                <HashRouter>
                    <SetupWizard state={state} onComplete={handleSetup} />
                </HashRouter>
            );
    }

    // Calculate current lesson number (1-5 based on rewards collected in last 24h)
    const rewardsLast24h = Array.isArray(lessonRewards) 
        ? lessonRewards.filter((t: number) => currentTime - t < 24 * 60 * 60 * 1000).length 
        : 0;
    const currentLessonNumber = Math.min(5, rewardsLast24h + 1);

  return (
    <HashRouter>
        <div className="h-screen w-full bg-blue-50 text-slate-800 font-sans select-none flex flex-col overflow-hidden">
                {/* HUD - Fixed header */}
                <div className="h-16 bg-white border-b border-blue-100 flex items-center justify-between px-4 z-50 shrink-0 shadow-md relative">
                    <div className="flex items-center gap-4 cursor-pointer z-10" onClick={() => setShowNameChange(true)}>
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl border-2 border-blue-800 shadow-sm">
                            {state.player.level}
                        </div>
                        {/* Player Avatar */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-300 shadow-sm">
                            <img 
                                src={`/assets/Avatars/${state.player.avatar || 'Avatar001.png'}`} 
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <div className="font-black text-blue-900 uppercase leading-none text-lg flex items-center gap-2">
                                 {state.player.name} <Edit2 size={12} className="text-slate-400"/>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 XP: {state.player.xp} / {getXpForLevel(state.player.level + 1)}
                            </div>
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (state.player.xp / getXpForLevel(state.player.level + 1)) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Persistent Navigation Buttons (Centered) */}
                    <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 z-10">
                         <Link to="/" className="p-2 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded-xl transition-colors border-2 border-transparent hover:border-blue-200" title="Dashboard">
                             <Home size={24} />
                         </Link>
                         <Link to="/explore" className="p-2 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded-xl transition-colors border-2 border-transparent hover:border-blue-200" title="School List">
                             <MapIcon size={24} />
                         </Link>
                         <button onClick={() => setShowGraffitiWall(true)} className="p-2 bg-slate-100 hover:bg-orange-100 text-orange-700 rounded-xl transition-colors border-2 border-transparent hover:border-orange-200" title="Graffiti Wall">
                             <Blocks size={24} />
                         </button>
                         <button onClick={() => setShowGlobalBackpack(true)} className="p-2 bg-slate-100 hover:bg-amber-100 text-slate-700 rounded-xl transition-colors border-2 border-transparent hover:border-amber-200 relative" title="Backpack">
                             <Backpack size={24} />
                             {state.player.inventory.length > 0 && (
                                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                     {state.player.inventory.length}
                                 </span>
                             )}
                         </button>
                         <button onClick={() => setShowShop(true)} className="p-2 bg-slate-100 hover:bg-green-100 text-green-700 rounded-xl transition-colors border-2 border-transparent hover:border-green-200 relative" title="Shop">
                             <ShoppingBag size={24} />
                         </button>
                     <Link to="/rankings" className="p-2 bg-white hover:bg-slate-100 text-yellow-800 rounded-xl transition-colors border-2 border-transparent hover:border-yellow-300 flex items-center justify-center" title="Player Rankings">
                         <Trophy size={22} className="text-yellow-700" />
                     </Link>
                     <Link to="/rules" className="p-2 bg-white hover:bg-slate-100 text-blue-800 rounded-xl transition-colors border-2 border-transparent hover:border-blue-300 flex items-center justify-center" title="Rules">
                         <span className="text-2xl font-black leading-none">?</span>
                     </Link>
                     <button
                         className="p-2 bg-white hover:bg-slate-100 text-gray-700 rounded-xl transition-colors border-2 border-transparent hover:border-gray-300 flex items-center justify-center ml-1"
                         title="Admin"
                         type="button"
                         aria-label="Admin"
                         onClick={() => setShowAdminPassword(true)}
                     >
                         <Cog size={22} className="text-gray-700" />
                     </button>
                                {/* Admin Password Modal */}
                                {showAdminPassword && !adminUnlocked && (
                                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center">
                                            <h2 className="font-black text-2xl mb-4 text-blue-900">Admin Login</h2>
                                            <input
                                                type="password"
                                                className="w-full p-3 border-2 border-blue-200 rounded-xl mb-3 text-lg"
                                                placeholder="Enter admin password"
                                                value={adminPassword}
                                                onChange={e => { setAdminPassword(e.target.value); setAdminError(''); }}
                                                onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
                                                autoFocus
                                            />
                                            {adminError && <div className="text-red-600 font-bold mb-2 text-sm">{adminError}</div>}
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
                                                    onClick={handleAdminLogin}
                                                >Enter</button>
                                                <button
                                                    className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
                                                    onClick={() => { setShowAdminPassword(false); setAdminPassword(''); setAdminError(''); }}
                                                >Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Redirect to admin if unlocked */}
                                {adminUnlocked && showAdminPassword && (
                                    (() => { setShowAdminPassword(false); setAdminPassword(''); setAdminError(''); window.location.hash = '#/admin'; return null; })()
                                )}
                    </div>

                    <div className="flex items-center gap-3 z-10">
                    <GlobalLessonTimer 
                        player={state.player}
                        lessonTime={Math.max(0, LESSON_DURATION - (currentTime - lessonStart))}
                        lessonNumber={currentLessonNumber}
                        rewardAvailable={rewardAvailable}
                        rewardCollected={rewardCollected}
                        onCollectReward={handleCollectLessonReward}
                        rewardTimeout={rewardTimeout}
                    />
                    
                    <div className="flex flex-col items-end mr-2">
                        {state.player.fatigueImmunityExpires && state.player.fatigueImmunityExpires > currentTime ? (
                            <>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500 animate-pulse">
                                    🍫 Fatigue Free
                                </span>
                                <div className="font-mono font-black text-lg text-purple-600">
                                    {formatCountdownTime(state.player.fatigueImmunityExpires - currentTime)}
                                </div>
                            </>
                        ) : (
                            <>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${state.player.fatigue > 0 ? 'text-orange-500 animate-pulse' : 'text-emerald-500'}`}>
                                     {state.player.fatigue > 0 ? 'Fatigue' : 'Rested'}
                                </span>
                                <div className={`font-mono font-black text-sm ${state.player.fatigue > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                     {formatFatigueTime(state.player.fatigue)}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-300 shadow-sm">
                        <Coins size={16} className="text-yellow-600" />
                        <span className="font-mono font-black text-yellow-800">{state.player.coins}</span>
                    </div>
                </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <Routes>
                    <Route path="/" element={<Dashboard state={state} onNavigate={() => {}} isUnderAttack={false} onEditName={() => setShowNameChange(true)} />} />
                    <Route path="/explore" element={<Explore state={state} onNavigate={() => {}} />} />
                    <Route path="/school/:schoolId" element={<SchoolView state={state} onNavigate={() => {}} onKick={() => {}} onLeave={() => {}} />} />
                    <Route path="/school/:schoolId/class/:classId" element={<ClassView state={state} onUpdateState={handleUpdate} onNavigate={() => {}} setShowSchoolLevelUp={setShowSchoolLevelUp} />} />
                    <Route path="/admin" element={adminUnlocked ? <AdminConsole state={state} onUpdateState={handleUpdate} onClose={() => { setAdminUnlocked(false); window.location.hash = '#/'; }} /> : <Navigate to="/" />} />
                    <Route path="/rankings" element={<PlayerList players={[
                        state.player,
                        ...state.schools.flatMap(s => (s.members || [])
                            .filter(m => m.id !== state.player.id)
                            .map(m => ({
                                ...m,
                                coins: 0,
                                fatigue: 0,
                                fatigueImmunityExpires: 0,
                                backpackSize: 0,
                                inventory: [],
                                nameChangeCost: 0,
                                schoolId: s.id,
                                cooldownUntil: 0,
                                lastDailyTreasure: 0,
                                lastActive: m.lastActive,
                                lastLessonAwarded: 0,
                                stats: m.stats || { tagsPlaced: 0, tagsCleaned: 0, treasuresFound: 0 },
                                xp: m.reputation || 0,
                                level: m.level,
                                name: m.name,
                                id: m.id
                            })))
                    ]} schools={state.schools.map(s => ({ id: s.id, name: s.name, memberIds: s.memberIds }))} />} />
                    <Route path="/rules" element={<GameRulesPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </div>
        
        {/* Modals */}
        {showLevelUp && <LevelUpModal level={showLevelUp.level} bonusCoins={showLevelUp.bonusCoins} onClose={() => setShowLevelUp(null)} />}
        {showSchoolLevelUp && <SchoolLevelUpModal schoolName={showSchoolLevelUp.schoolName} level={showSchoolLevelUp.level} onClose={() => setShowSchoolLevelUp(null)} />}
        {showNameChange && (() => {
            const playerSchool = state.schools.find(s => s.id === state.player.schoolId);
            const isSchoolPrincipal = playerSchool?.principalId === state.player.id;
            return (
                <NameChangeModal 
                    currentName={state.player.name} 
                    cost={state.player.nameChangeCost}
                    currentSchoolName={playerSchool?.name || ''}
                    schoolCost={playerSchool?.nameChangeCost || 100}
                    isSchoolPrincipal={isSchoolPrincipal}
                    currentAvatar={state.player.avatar || 'Avatar001.png'}
                    playerCoins={state.player.coins}
                    onClose={() => setShowNameChange(false)} 
                    onSave={(n) => {
                        setState(prev => {
                            // CRITICAL: Only update the fields that actually changed to avoid overwriting fresh state
                            // Don't call saveGame here - let the auto-save useEffect handle it
                            const newState = { 
                                ...prev, 
                                player: { 
                                    ...prev.player, 
                                    name: n, 
                                    coins: prev.player.coins - prev.player.nameChangeCost, 
                                    nameChangeCost: Math.floor(prev.player.nameChangeCost * 1.5) 
                                } 
                            };
                            // Update identity localStorage immediately for login persistence
                            localStorage.setItem('player', JSON.stringify({
                                id: newState.player.id,
                                name: n,
                                schoolId: newState.player.schoolId
                            }));
                            return newState;
                            // Note: saveGame will be called by auto-save useEffect
                        });
                        setShowNameChange(false);
                    }}
                    onSaveAvatar={async (avatar) => {
                        const avatarCost = 100;
                        if (state.player.coins < avatarCost) return;
                        
                        try {
                            // Update backend
                            const res = await fetch(`http://localhost:4000/api/user/${state.player.id}/avatar`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ avatar })
                            });
                            
                            if (!res.ok) throw new Error('Failed to update avatar');
                            
                            // Update local state
                            setState(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    avatar: avatar,
                                    coins: prev.player.coins - avatarCost
                                }
                            }));
                            
                            setShowNameChange(false);
                        } catch (error) {
                            console.error('Error updating avatar:', error);
                        }
                    }}
                    onSaveSchoolName={(n) => {
                        setState(prev => {
                            const school = prev.schools.find(s => s.id === prev.player.schoolId);
                            if (!school || school.principalId !== prev.player.id) return prev;
                            
                            const cost = school.nameChangeCost || 100;
                            if (prev.player.coins < cost) return prev;
                            
                            return {
                                ...prev,
                                player: {
                                    ...prev.player,
                                    coins: prev.player.coins - cost
                                },
                                schools: prev.schools.map(s => 
                                    s.id === school.id 
                                        ? { ...s, name: n, nameChangeCost: cost * 2 }
                                        : s
                                )
                            };
                        });
                        setShowNameChange(false);
                    }}
                    onLogout={() => {
                        localStorage.removeItem('player');
                        window.location.hash = '#/login';
                        window.location.reload();
                    }}
                />
            );
        })()}
        {showGlobalBackpack && <BackpackModal player={state.player} onClose={() => setShowGlobalBackpack(false)} onUse={handleGlobalUseItem} onDelete={handleDeleteItem} />}
        {showShop && <ShopModal player={state.player} onClose={() => setShowShop(false)} onPurchase={handleShopPurchase} />}
        
        {/* Graffiti Wall Modal */}
        {showGraffitiWall && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="relative w-[90vw] h-[90vh] max-w-6xl bg-gradient-to-br from-orange-900 via-red-800 to-orange-900 rounded-3xl shadow-2xl border-4 border-orange-700 overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={() => setShowGraffitiWall(false)}
                        className="absolute top-4 right-4 z-10 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-lg"
                        title="Close Wall"
                    >
                        <X size={24} />
                    </button>

                    {/* Brick Wall Background with Graffiti */}
                    <div 
                        className="w-full h-full relative"
                        style={{
                            backgroundImage: `repeating-linear-gradient(
                                0deg,
                                #8B4513 0px,
                                #8B4513 2px,
                                transparent 2px,
                                transparent 30px
                            ),
                            repeating-linear-gradient(
                                90deg,
                                #A0522D 0px,
                                #A0522D 2px,
                                transparent 2px,
                                transparent 60px
                            ),
                            linear-gradient(
                                135deg,
                                #CD5C5C 0%,
                                #A0522D 25%,
                                #8B4513 50%,
                                #A0522D 75%,
                                #CD5C5C 100%
                            )`,
                            backgroundSize: '100% 30px, 60px 100%, 100% 100%',
                            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Render all graffiti */}
                        <div className="w-full h-full relative p-8 pb-32">
                            {state.graffiti
                                .filter(graf => {
                                    // Remove graffiti older than 30 minutes
                                    const age = Date.now() - graf.timestamp;
                                    return age < 30 * 60 * 1000;
                                })
                                .map((graf) => {
                                    // Calculate opacity based on age
                                    const age = Date.now() - graf.timestamp;
                                    const minutes = age / (60 * 1000);
                                    let opacity = 1;
                                    
                                    if (minutes >= 25) opacity = 0.2;      // 25-30 mins: 20%
                                    else if (minutes >= 20) opacity = 0.35; // 20-25 mins: 35%
                                    else if (minutes >= 15) opacity = 0.5;  // 15-20 mins: 50%
                                    else if (minutes >= 10) opacity = 0.65; // 10-15 mins: 65%
                                    else if (minutes >= 5) opacity = 0.8;   // 5-10 mins: 80%
                                    // 0-5 mins: 100%
                                    
                                    return (
                                        <div
                                            key={graf.id}
                                            className="absolute text-2xl font-black whitespace-nowrap select-none pointer-events-none"
                                            style={{
                                                left: `${graf.x}%`,
                                                top: `${graf.y}%`,
                                                transform: `rotate(${graf.rotation}deg)`,
                                                color: graf.color || '#FFD700',
                                                opacity: opacity,
                                                textShadow: `
                                                    3px 3px 0px #000,
                                                    -1px -1px 0px #000,
                                                    1px -1px 0px #000,
                                                    -1px 1px 0px #000,
                                                    1px 1px 0px #000,
                                                    0px 3px 6px rgba(0,0,0,0.8)
                                                `,
                                                fontFamily: 'Impact, Arial Black, sans-serif',
                                                letterSpacing: '2px',
                                                transition: 'opacity 1s ease-in-out'
                                            }}
                                        >
                                            {graf.text}
                                        </div>
                                    );
                                })}\n                        </div>

                        {/* Input Panel at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-6 backdrop-blur-sm">
                            <div className="max-w-3xl mx-auto flex items-center gap-4">
                                <input
                                    type="text"
                                    value={graffitiText}
                                    onChange={(e) => setGraffitiText(e.target.value.slice(0, 20))}
                                    maxLength={20}
                                    placeholder="Write your graffiti (max 20 chars)..."
                                    className="flex-1 px-6 py-4 text-xl font-bold bg-white/10 border-4 border-orange-500 rounded-2xl text-white placeholder-orange-300 focus:outline-none focus:border-yellow-400 transition-colors"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') handleGraffitiSubmit();
                                    }}
                                />
                                <div className="text-orange-300 font-black text-lg min-w-[60px] text-center">
                                    {graffitiText.length}/20
                                </div>
                                <button
                                    onClick={handleGraffitiSubmit}
                                    disabled={!graffitiText.trim() || graffitiText.length > 20 || state.player.coins < 50}
                                    className={`px-8 py-4 font-black text-xl rounded-2xl transition-all transform hover:scale-105 shadow-lg ${
                                        !graffitiText.trim() || graffitiText.length > 20 || state.player.coins < 50
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-400 hover:to-orange-500'
                                    }`}
                                >
                                    💰 Pay 50 to Scrawl
                                </button>
                            </div>
                            {state.player.coins < 50 && (
                                <p className="text-center mt-3 text-red-400 font-bold text-lg">
                                    ⚠️ You need 50 coins to add graffiti (You have {state.player.coins})
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Backpack Full Popup */}
        {backpackFullMessage && (
            <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl shadow-2xl p-12 border-4 border-red-400 animate-bounce">
                    <h2 className="font-black text-4xl text-red-900 text-center">🎒 Your backpack is full!</h2>
                    <p className="text-xl font-bold text-red-700 text-center mt-4">Please make space before purchasing.</p>
                </div>
            </div>
        )}
        
        {/* Purchase Success Popup */}
        {purchaseSuccess && (
            <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl shadow-2xl p-12 border-4 border-green-400 animate-bounce">
                    <h2 className="font-black text-4xl text-green-900 text-center">✨ Enjoy your purchase! ✨</h2>
                </div>
            </div>
        )}
        
        {/* Easter Egg Reward Popup */}
        {easterEggReward && (
            <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 rounded-3xl shadow-2xl p-12 border-4 border-pink-400 animate-bounce">
                    <h2 className="font-black text-4xl text-purple-900 text-center whitespace-pre-line">{easterEggReward}</h2>
                </div>
            </div>
        )}
        
        {/* Chocolate Activation Modal */}
        {chocolateActivation && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-2xl p-12 w-full max-w-md flex flex-col items-center border-4 border-purple-400">
                    <div className="text-7xl mb-6 animate-bounce">🍫</div>
                    <h2 className="font-black text-3xl mb-4 text-purple-900 text-center">Fatigue Free Activated!</h2>
                    <p className="text-xl font-bold text-purple-700 text-center mb-6">
                        {Math.floor(chocolateActivation.duration / 60000)} minute{chocolateActivation.duration >= 120000 ? 's' : ''} of fatigue-free cleaning available!
                    </p>
                    {chocolateActivation.countdown > 0 ? (
                        <div className="text-9xl font-black text-purple-600 animate-pulse">
                            {chocolateActivation.countdown}
                        </div>
                    ) : (
                        <div className="text-4xl font-black text-green-600 animate-pulse">
                            GO!
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {/* Game Blocked - Multiple Tabs Detected */}
        {isGameBlocked && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-red-600 to-red-900 rounded-3xl shadow-2xl p-12 w-full max-w-md border-4 border-red-400">
                    <div className="text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 className="font-black text-3xl text-white mb-4">Game Already Open</h2>
                        <p className="text-lg font-bold text-red-100 mb-8">{blockMessage}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-white text-red-900 font-black rounded-xl shadow-lg hover:bg-gray-100 transition-all text-lg"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Full Blue Notification Banner */}
        <FullBlueNotificationBanner notifications={fullBlueNotifications} />
    </HashRouter>
  );
}

// Wrap App in ErrorBoundary
const WrappedApp = () => (
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

export default WrappedApp;