import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Target, Shield, Trophy, Coins, Zap, ShoppingBag, Clock, Users, Sparkles } from 'lucide-react';

const GameRulesPage: React.FC = () => {
    return (
        <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">📚 Game Rules</h1>
                        <p className="text-xl text-purple-300 font-bold">Master the art of school rivalry!</p>
                    </div>
                    <Link 
                        to="/" 
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                    >
                        <Home size={20} />
                        Back to Game
                    </Link>
                </div>
            </div>

            {/* Rules Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Objective */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(59,130,246,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Target size={28} className="text-blue-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">The Objective</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-blue-50 leading-relaxed">
                                <span className="font-black text-yellow-300">Level up your player</span> by tagging rival schools and cleaning your own! Earn XP, coins, and reputation to become the ultimate school vandal.
                            </p>
                            <p className="text-lg text-blue-50 leading-relaxed">
                                <span className="font-black text-yellow-300">Grow your school's power</span> by earning school points. Every action helps your school level up and dominate the rankings!
                            </p>
                            <div className="flex gap-2 mt-4">
                                <div className="flex-1 bg-indigo-900/40 backdrop-blur-sm rounded-lg p-3 border border-indigo-400/30">
                                    <div className="text-xs font-bold text-indigo-200 uppercase">Player Goal</div>
                                    <div className="text-xl font-black text-white">Level 99+</div>
                                </div>
                                <div className="flex-1 bg-purple-900/40 backdrop-blur-sm rounded-lg p-3 border border-purple-400/30">
                                    <div className="text-xs font-bold text-purple-200 uppercase">School Goal</div>
                                    <div className="text-xl font-black text-white">Top Rank</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Tagging */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-red-600 via-rose-700 to-orange-900 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(239,68,68,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg">
                                <Sparkles size={28} className="text-red-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Tagging Rivals</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <div className="space-y-2">
                                <p className="text-lg text-red-50 leading-relaxed">
                                    <span className="font-black text-yellow-300">Tag rival schools</span> to earn XP and coins! Each weapon has a power level that determines rewards.
                                </p>
                                <p className="text-base text-red-100">
                                    <span className="font-black text-yellow-300">Instant:</span> +5 XP when placed
                                </p>
                                <p className="text-base text-red-100">
                                    <span className="font-black text-yellow-300">Maturation:</span> Tags mature over time (varies by weapon)
                                </p>
                                <p className="text-base text-red-100">
                                    <span className="font-black text-yellow-300">Full Blue:</span> When fully matured, earn <span className="font-black">10x weapon power</span> in XP + coins!
                                </p>
                                <p className="text-base text-red-100">
                                    <span className="font-black text-yellow-300">Tag Over:</span> You can tag over rival tags to replace them with yours and earn bonus points!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Cleaning */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(16,185,129,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Shield size={28} className="text-emerald-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Cleaning Your School</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-emerald-50 leading-relaxed">
                                <span className="font-black text-cyan-300">Clean tags from your school</span> to protect its reputation and earn rewards!
                            </p>
                            <div className="space-y-2">
                                <p className="text-base text-emerald-100">
                                    <span className="font-black text-cyan-300">Cost:</span> Costs coins based on the cleaner you use. Better cleaners cost more but are more efficient!
                                </p>
                                <p className="text-base text-emerald-100">
                                    <span className="font-black text-cyan-300">Rewards:</span> +5 XP and +5 School Points per tag
                                </p>
                                <p className="text-base text-emerald-100">
                                    <span className="font-black text-cyan-300">Fatigue:</span> Cleaning builds fatigue based on tag weapon power vs your cleaner level. If you have 60 seconds of fatigue, you cannot clean another tag for 60 seconds - it's real time!
                                </p>
                                <p className="text-base text-emerald-100">
                                    <span className="font-black text-cyan-300">Pro Tip:</span> Use chocolate or hall passes to reduce/avoid fatigue!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Weapons & Tools */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-purple-600 via-violet-700 to-fuchsia-900 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(168,85,247,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Trophy size={28} className="text-purple-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Weapons & Tools</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-purple-50 leading-relaxed">
                                <span className="font-black text-pink-300">Tagging Weapons (15):</span> Crayon, Pencil, Biro, Fountain Pen, Highlighter, Sharpie, Nail Varnish, Spray Paint, Pink Paint Can, Blue Paint Can, Black Paint Can, Dog Poo, Fence Stainer, Tar, Nuclear Waste
                            </p>
                            <p className="text-base text-purple-100">
                                <span className="font-black text-pink-300">Cleaning Tools (15):</span> Finger, Sponge, Blackboard Rubber, Antibac Spray, Scouring Pad, Bleach, Mr 6 Pack Cleaner, Cillit Boom, Pressure Washer, Meths, Paint Stripper Gun, Stripping Machine, Dynomite, Toxic Acid, Magic Wand
                            </p>
                            <p className="text-sm text-purple-200 mt-2">
                                Higher level weapons have more power and longer maturation times. Upgrade your tools to clean more efficiently!
                            </p>
                        </div>
                    </div>
                </div>

                {/* 5. Treasure Hunting */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-yellow-600 via-amber-700 to-orange-900 shadow-[0_20px_60px_-15px_rgba(251,191,36,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(251,191,36,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Coins size={28} className="text-yellow-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Treasure Hunting</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-yellow-50 leading-relaxed">
                                <span className="font-black text-yellow-300">Search desks</span> in any school to find hidden treasures! Each desk can be searched once per hour.
                            </p>
                            <p className="text-base text-yellow-100 font-bold mb-2">Treasures you can find:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-yellow-100">
                                <p>💰 Coins (10-25)</p>
                                <p>💰 Coin Pile (25-50)</p>
                                <p>🍫 Chocolate Bar</p>
                                <p>🍫 Choco Pieces</p>
                                <p>🟨 Hall Pass</p>
                                <p>🥚 Easter Eggs (8 types)</p>
                            </div>
                            <p className="text-xs text-yellow-200 mt-3 italic">
                                ✨ More treasures and items coming in future updates!
                            </p>
                        </div>
                    </div>
                </div>

                {/* 6. Special Items */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-pink-600 via-rose-700 to-red-900 shadow-[0_20px_60px_-15px_rgba(236,72,153,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(236,72,153,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <ShoppingBag size={28} className="text-pink-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Special Items</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-base text-pink-50">
                                    <span className="text-2xl">🍫</span>
                                    <span><span className="font-black text-pink-300">Chocolate Bar:</span> Clean without fatigue for 1 minute</span>
                                </div>
                                <div className="flex items-center gap-2 text-base text-pink-50">
                                    <span className="text-2xl">🍫🍫</span>
                                    <span><span className="font-black text-pink-300">Choco Pieces:</span> Clean without fatigue for 5 minutes</span>
                                </div>
                                <div className="flex items-center gap-2 text-base text-pink-50">
                                    <span className="text-2xl">🟨</span>
                                    <span><span className="font-black text-pink-300">Hall Pass:</span> Instantly reduces fatigue by 1 hour</span>
                                </div>
                                <div className="flex items-center gap-2 text-base text-pink-50">
                                    <span className="text-2xl">🥚</span>
                                    <span><span className="font-black text-pink-300">Easter Eggs:</span> Hatch for mystery rewards!</span>
                                </div>
                                <div className="flex items-center gap-2 text-base text-pink-50">
                                    <span className="text-2xl">🎒</span>
                                    <span><span className="font-black text-pink-300">Backpack:</span> Upgrade to carry more items at once</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 7. Lesson Timer */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(6,182,212,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Clock size={28} className="text-cyan-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Lesson Timer</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-cyan-50 leading-relaxed">
                                <span className="font-black text-cyan-300">Every hour,</span> a new lesson starts. Collect your reward within 1 minute when the lesson ends!
                            </p>
                            <div className="space-y-2">
                                <p className="text-base text-cyan-100">⏰ Lessons run for 60 minutes</p>
                                <p className="text-base text-cyan-100">🎁 60-second collection window</p>
                                <p className="text-base text-cyan-100">📚 Max 5 rewards per day</p>
                            </div>
                            <div className="bg-blue-900/40 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30 mt-4">
                                <div className="text-xs font-bold text-blue-200 uppercase">Reward</div>
                                <div className="text-xl font-black text-white">100 Coins</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 8. Fair Gameplay */}
                <div className="group relative rounded-3xl bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 shadow-[0_20px_60px_-15px_rgba(100,116,139,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(100,116,139,0.7)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-400 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Users size={28} className="text-slate-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Fair Gameplay</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3">
                            <p className="text-lg text-slate-50 leading-relaxed">
                                <span className="font-black text-slate-300">Play fair and have fun!</span> School Vandals is about friendly competition and strategy.
                            </p>
                            <div className="space-y-2">
                                <p className="text-base text-slate-100">✅ Respect other players</p>
                                <p className="text-base text-slate-100">✅ No cheating or exploits</p>
                                <p className="text-base text-slate-100">✅ Work together with your school</p>
                                <p className="text-base text-slate-100">✅ Have fun and be creative!</p>
                            </div>
                            <div className="bg-zinc-900/40 backdrop-blur-sm rounded-lg p-3 border border-zinc-400/30 mt-4">
                                <div className="text-xs font-bold text-zinc-200 uppercase">Remember</div>
                                <div className="text-sm font-black text-white">It's all in good fun - may the best school win!</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Janitor Warning - Full Width Red Section */}
                <div className="md:col-span-2 group relative rounded-3xl bg-gradient-to-br from-red-700 via-red-800 to-red-950 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.7)] hover:shadow-[0_25px_70px_-15px_rgba(220,38,38,0.9)] hover:scale-[1.01] transition-all duration-300 overflow-hidden border-2 border-red-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                                <span className="text-4xl">🧹</span>
                            </div>
                            <h2 className="text-4xl font-black text-white drop-shadow-lg uppercase tracking-wide">⚠️ Janitor Warning ⚠️</h2>
                        </div>
                        <div className="bg-red-950/60 backdrop-blur-sm rounded-xl p-6 border-2 border-red-400/50 space-y-4">
                            <p className="text-xl font-black text-white leading-relaxed">
                                🚨 THE JANITOR PATROLS EVERY HOUR! 🚨
                            </p>
                            <p className="text-lg font-bold text-red-100 leading-relaxed">
                                Every 60 minutes, the janitor automatically sweeps ALL schools and removes every fully matured tag (tags that have turned completely blue). This happens on the backend - no one can stop it!
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-red-900/60 rounded-lg p-4 border border-red-400/40">
                                    <p className="text-base font-bold text-white mb-2">📉 School Penalties:</p>
                                    <ul className="text-sm font-bold text-red-100 space-y-1 list-disc list-inside">
                                        <li>Schools lose points equal to the tag's VALUE (e.g., 20 coin tag = -20 points)</li>
                                        <li>Higher level tags cost MORE and lose MORE points!</li>
                                        <li>Schools can be DEMOTED if points drop too low</li>
                                        <li>Demoted schools receive a Certificate of Shame</li>
                                        <li>ALL students see the demotion announcement</li>
                                    </ul>
                                </div>
                                <div className="bg-red-900/60 rounded-lg p-4 border border-red-400/40">
                                    <p className="text-base font-bold text-white mb-2">🛡️ Protect Your School:</p>
                                    <ul className="text-sm font-bold text-red-100 space-y-1 list-disc list-inside">
                                        <li>Clean tags BEFORE they turn fully blue</li>
                                        <li>Monitor enemy schools for mature tags</li>
                                        <li>Time your attacks to mature right before the hour</li>
                                        <li>Use chocolate bars to clean without fatigue</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-center text-lg font-black text-red-200 mt-4 uppercase tracking-wider">
                                Don't let your school become a disgrace - clean those tags! 🧽
                            </p>
                        </div>
                    </div>
                </div>

                {/* 9. Pro Tips - Full Width */}
                <div className="md:col-span-2 group relative rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-700 to-green-900 shadow-[0_20px_60px_-15px_rgba(20,184,166,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(20,184,166,0.7)] hover:scale-[1.01] transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <div className="relative p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Zap size={28} className="text-teal-900" />
                            </div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">Pro Tips & Strategies</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-2xl mb-2">🎯</div>
                                <h3 className="text-lg font-black text-white mb-2">Tag Strategically</h3>
                                <p className="text-sm text-emerald-50">Use powerful weapons on rival schools to maximize XP. Let tags mature for full rewards!</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-2xl mb-2">🧹</div>
                                <h3 className="text-lg font-black text-white mb-2">Clean Smart</h3>
                                <p className="text-sm text-emerald-50">Use chocolate before cleaning to avoid fatigue. Keep your school pristine for better reputation!</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="text-2xl mb-2">💰</div>
                                <h3 className="text-lg font-black text-white mb-2">Save Coins</h3>
                                <p className="text-sm text-emerald-50">Invest in backpack upgrades early. More space means more items and better rewards!</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="max-w-6xl mx-auto mt-6 text-center">
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30">
                    <p className="text-2xl font-black text-white mb-2">Ready to dominate? 🏆</p>
                    <p className="text-lg text-purple-200">Tag smart, clean hard, and lead your school to victory!</p>
                </div>
            </div>
        </div>
    );
};

export default GameRulesPage;
