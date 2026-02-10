// Helper to get weapon image path by tool name
export function getWeaponImagePath(toolName: string): string {
  // Convert tool name to filename - remove spaces, keep CamelCase
  const fileName = toolName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
  return `/assets/weapons/${fileName}.png`;
}

import React from 'react';
import { Tool, ToolType, TagSymbol } from './types';

/**
 * Tag weapons (Instruments): 10c base and 30% increase per level requirement
 * Formula: Math.round(10 * Math.pow(1.3, level - 1))
 */
export const INSTRUMENTS: Tool[] = [
  { id: 'i1', name: 'Crayon', levelRequired: 1, type: ToolType.TAG, power: 1, maturationMs: 5 * 60 * 1000, cost: 10, fatigueCost: 0 },
  { id: 'i2', name: 'Pencil', levelRequired: 2, type: ToolType.TAG, power: 2, maturationMs: 10 * 60 * 1000, cost: 13, fatigueCost: 0 },
  { id: 'i3', name: 'Biro', levelRequired: 3, type: ToolType.TAG, power: 3, maturationMs: 20 * 60 * 1000, cost: 17, fatigueCost: 0 },
  { id: 'i4', name: 'Fountain Pen', levelRequired: 4, type: ToolType.TAG, power: 4, maturationMs: 40 * 60 * 1000, cost: 22, fatigueCost: 0 },
  { id: 'i5', name: 'Highlighter', levelRequired: 5, type: ToolType.TAG, power: 5, maturationMs: 60 * 60 * 1000, cost: 29, fatigueCost: 0 },
  { id: 'i6', name: 'Sharpie', levelRequired: 6, type: ToolType.TAG, power: 6, maturationMs: 2 * 60 * 60 * 1000, cost: 37, fatigueCost: 0 },
  { id: 'i7', name: 'Nail Varnish', levelRequired: 7, type: ToolType.TAG, power: 7, maturationMs: 4 * 60 * 60 * 1000, cost: 48, fatigueCost: 0 },
  { id: 'i8', name: 'Spray Paint', levelRequired: 8, type: ToolType.TAG, power: 8, maturationMs: 8 * 60 * 60 * 1000, cost: 63, fatigueCost: 0 },
  { id: 'i9', name: 'Pink Paint Can', levelRequired: 9, type: ToolType.TAG, power: 9, maturationMs: 12 * 60 * 60 * 1000, cost: 82, fatigueCost: 0 },
  { id: 'i10', name: 'Blue Paint Can', levelRequired: 10, type: ToolType.TAG, power: 10, maturationMs: 24 * 60 * 60 * 1000, cost: 106, fatigueCost: 0 },
  { id: 'i11', name: 'Black Paint Can', levelRequired: 11, type: ToolType.TAG, power: 11, maturationMs: 36 * 60 * 60 * 1000, cost: 138, fatigueCost: 0 },
  { id: 'i12', name: 'Dog Poo', levelRequired: 12, type: ToolType.TAG, power: 12, maturationMs: 48 * 60 * 60 * 1000, cost: 179, fatigueCost: 0 },
  { id: 'i13', name: 'Fence Stainer', levelRequired: 13, type: ToolType.TAG, power: 13, maturationMs: 72 * 60 * 60 * 1000, cost: 233, fatigueCost: 0 },
  { id: 'i14', name: 'Tar', levelRequired: 14, type: ToolType.TAG, power: 14, maturationMs: 96 * 60 * 60 * 1000, cost: 303, fatigueCost: 0 },
  { id: 'i15', name: 'Nuclear Waste', levelRequired: 15, type: ToolType.TAG, power: 15, maturationMs: 168 * 60 * 60 * 1000, cost: 394, fatigueCost: 0 },
];

export const generateTagSymbols = (): TagSymbol[] => {
  const icons = [
    '😂', '☕', '🐽', '🦷', '😍',
    '🤢', '👺', '⭐', '💩', '🧶',
    '😠', '👍', '💫', '😎', '😇',
    '🤓', '🎅', '🤑', '🤥', '👮'
  ];

  const symbols: TagSymbol[] = [];
  let currentCost = 10;
  for (let i = 0; i < 20; i++) {
    symbols.push({
      name: icons[i],
      levelRequired: i + 1,
      cost: Math.round(currentCost)
    });
    currentCost *= 1.4; // 40% increase per level
  }
  return symbols;
};

export const TAG_SYMBOLS_LIST = generateTagSymbols();
export const TAG_SYMBOLS = TAG_SYMBOLS_LIST.map(s => s.name);

/**
 * Cleaning tools: 10c base and 30% increase per level requirement
 * Names match image filenames: Finger, Sponge, Scouring Pad, Board Eraser, Spray Bottle, 
 * Alcohol, Bleach, Cillit Bang, Mr Clean, Pressure Washer, Aerator, Heat Gun, Wand, Bomb, Barrel
 */
export const CLEANING_TOOLS: Tool[] = [
  { id: 'c1', name: 'Finger', levelRequired: 1, type: ToolType.CLEAN, power: 1, cost: 10, fatigueCost: 0 },
  { id: 'c2', name: 'Sponge', levelRequired: 2, type: ToolType.CLEAN, power: 1.5, cost: 13, fatigueCost: 0 },
  { id: 'c3', name: 'Blackboard Rubber', levelRequired: 3, type: ToolType.CLEAN, power: 2, cost: 17, fatigueCost: 0 },
  { id: 'c4', name: 'Antibac Spray', levelRequired: 4, type: ToolType.CLEAN, power: 3, cost: 22, fatigueCost: 0 },
  { id: 'c5', name: 'Scouring Pad', levelRequired: 5, type: ToolType.CLEAN, power: 4, cost: 29, fatigueCost: 0 },
  { id: 'c6', name: 'Bleach', levelRequired: 6, type: ToolType.CLEAN, power: 5, cost: 37, fatigueCost: 0 },
  { id: 'c7', name: 'Mr 6 Pack Cleaner', levelRequired: 7, type: ToolType.CLEAN, power: 6, cost: 48, fatigueCost: 0 },
  { id: 'c8', name: 'Cillit Boom', levelRequired: 8, type: ToolType.CLEAN, power: 7, cost: 63, fatigueCost: 0 },
  { id: 'c9', name: 'Pressure Washer', levelRequired: 9, type: ToolType.CLEAN, power: 8, cost: 82, fatigueCost: 0 },
  { id: 'c10', name: 'Meths', levelRequired: 10, type: ToolType.CLEAN, power: 9, cost: 106, fatigueCost: 0 },
  { id: 'c11', name: 'Paint Stripper Gun', levelRequired: 11, type: ToolType.CLEAN, power: 10, cost: 138, fatigueCost: 0 },
  { id: 'c12', name: 'Stripping Machine', levelRequired: 12, type: ToolType.CLEAN, power: 12, cost: 179, fatigueCost: 0 },
  { id: 'c13', name: 'Dynomite', levelRequired: 13, type: ToolType.CLEAN, power: 14, cost: 233, fatigueCost: 0 },
  { id: 'c14', name: 'Toxic Acid', levelRequired: 14, type: ToolType.CLEAN, power: 16, cost: 303, fatigueCost: 0 },
  { id: 'c15', name: 'Magic Wand', levelRequired: 15, type: ToolType.CLEAN, power: 20, cost: 394, fatigueCost: 0 },
];

export const ITEM_DEFINITIONS: Record<string, { name: string, description: string, icon: string, image?: string, color: string, fatigueReduction?: number }> = {
    'chocolate': { name: 'Chocolate', description: 'Use to activate 1 minute of Fatigue Free cleaning. Instantly sets your fatigue to zero and prevents any fatigue gain for 1 minute.', icon: '🍫', image: '/assets/treasures/chocolate.png', color: 'bg-orange-100 border-orange-300' },
    'chocolate_pieces': { name: 'Pieces of Chocolate', description: 'Use to activate 5 minutes of Fatigue Free cleaning. Instantly sets your fatigue to zero and prevents any fatigue gain for 5 minutes.', icon: '🍫🍫', image: '/assets/treasures/chocolate_pieces.png', color: 'bg-orange-200 border-orange-400' },
    'choco_1': { name: 'Bit of Chocolate', description: 'Use to instantly remove 5 minutes of fatigue from your total.', icon: '🍫', image: '/assets/treasures/chocolate.png', color: 'bg-orange-100 border-orange-300', fatigueReduction: 300 },
    'choco_2': { name: 'Chunk of Chocolate', description: 'Use to instantly remove 1 hour of fatigue from your total.', icon: '🍫🍫', image: '/assets/treasures/chocolate_pieces.png', color: 'bg-orange-200 border-orange-400', fatigueReduction: 3600 },
    'choco_3': { name: 'Chocolate Bar', description: 'Use to activate 1 minute of fatigue-free cleaning. No fatigue is gained for 60 seconds after use.', icon: '🍫🍫🍫', image: '/assets/treasures/chocolate.png', color: 'bg-purple-100 border-purple-300' },
    'hall_pass': { name: 'Hall Pass', description: 'Use to instantly remove 1 hour of fatigue from your total.', icon: '🟨', image: '/assets/treasures/Hall_Pass.png', color: 'bg-yellow-100 border-yellow-400', fatigueReduction: 3600 },
    'easter_egg_1': { name: 'Blue Burst Chase Bounty', description: 'Consume to receive 1-20 coins!', icon: '🥚', image: '/assets/treasures/easter_egg_1.png', color: 'bg-blue-100 border-blue-300' },
    'easter_egg_2': { name: 'Crimson Paw-Print Prize Cache', description: 'Consume to receive 21-40 coins!', icon: '🥚', image: '/assets/treasures/easter_egg_2.png', color: 'bg-red-100 border-red-300' },
    'easter_egg_3': { name: 'Lime & Bubblegum Safe-Base Stash', description: 'Consume to receive 41-50 coins!', icon: '🥚', image: '/assets/treasures/easter_egg_3.png', color: 'bg-lime-100 border-lime-300' },
    'easter_egg_4': { name: 'Aqua Clover Tag-Treasure', description: 'Consume to receive a Hall Pass!', icon: '🥚', image: '/assets/treasures/easter_egg_4.png', color: 'bg-cyan-100 border-cyan-300' },
    'easter_egg_5': { name: 'Neon Wave Runner\'s Loot', description: 'Consume to receive Chocolate!', icon: '🥚', image: '/assets/treasures/easter_egg_5.png', color: 'bg-violet-100 border-violet-300' },
    'easter_egg_6': { name: 'Pink Star Tagger\'s Treat Trove', description: 'Consume to receive Pieces of Chocolate!', icon: '🥚', image: '/assets/treasures/easter_egg_6.png', color: 'bg-pink-100 border-pink-300' },
    'easter_egg_7': { name: 'Rainbow Bunny Hideout Bounty', description: 'Consume to receive 100 coins + Hall Pass!', icon: '🥚', image: '/assets/treasures/easter_egg_7.png', color: 'bg-fuchsia-100 border-fuchsia-300' },
    'easter_egg_8': { name: 'Jolly Stripe Clean-Sweep Jackpot', description: 'Consume to upgrade your backpack! (1000 coins if max backpack)', icon: '🥚', image: '/assets/treasures/easter_egg_8.png', color: 'bg-amber-100 border-amber-300' },
};

// Backpack level definitions
export const BACKPACK_LEVELS: Record<number, { name: string, slots: number, image: string }> = {
    1: { name: 'Small Backpack', slots: 10, image: '/assets/backpacks/small_backpack.png' },
    2: { name: 'Medium Backpack', slots: 20, image: '/assets/backpacks/medium_backpack.png' },
    3: { name: 'Large Backpack', slots: 30, image: '/assets/backpacks/large_backpack.png' },
    4: { name: 'Hiking Backpack', slots: 50, image: '/assets/backpacks/hiking_backpack.png' },
    5: { name: 'Nike Backpack', slots: 100, image: '/assets/backpacks/nike_backpack.png' },
};

// Treasure spawn configuration
export const TREASURE_TYPES = [
    { type: 'coins', weight: 50, minAmount: 10, maxAmount: 25 },           // Single coin: 10-25 coins
    { type: 'coins_pile', weight: 20, minAmount: 25, maxAmount: 50 },      // Pile of coins: 25-50 coins
    { type: 'chocolate', weight: 50 },                                      // Chocolate: 10 mins fatigue reduction
    { type: 'chocolate_pieces', weight: 20 },                               // Pieces of Chocolate: 1 hour fatigue reduction
    { type: 'hall_pass', weight: 50 },                                      // Hall Pass: 1 hour fatigue reduction
    { type: 'easter_egg_1', weight: 0 },                                    // Easter Egg #1 (toggle via admin)
    { type: 'easter_egg_2', weight: 0 },                                    // Easter Egg #2 (toggle via admin)
    { type: 'easter_egg_3', weight: 0 },                                    // Easter Egg #3 (toggle via admin)
    { type: 'easter_egg_4', weight: 0 },                                    // Easter Egg #4 (toggle via admin)
    { type: 'easter_egg_5', weight: 0 },                                    // Easter Egg #5 (toggle via admin)
    { type: 'easter_egg_6', weight: 0 },                                    // Easter Egg #6 (toggle via admin)
    { type: 'easter_egg_7', weight: 0 },                                    // Easter Egg #7 (toggle via admin)
    { type: 'easter_egg_8', weight: 0 },                                    // Easter Egg #8 (toggle via admin)
];

export const DESK_COOLDOWN_MS = 1000 * 60 * 60; // 1 hour per desk
export const TREASURE_INTERVAL_MS = 1000 * 120; // 120 seconds (2 minutes) - default for testing, adjustable in admin console
export const UK_SCHOOL_TIERS = [
  'Nursery', 'Reception', 'Year 1', 'Year 2', 'Year 3', 
  'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8',
  'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'Year 13+', 'Academy Higher'
];
