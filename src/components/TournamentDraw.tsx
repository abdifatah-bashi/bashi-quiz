import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Trophy, Shuffle, RotateCcw, User, ChevronRight, Swords } from 'lucide-react';
import { cn } from '../utils';
import { soundService } from '../services/soundService';
import { Contestant } from '../types';

interface Participant {
  id: string;
  name: string;
}

interface Match {
  id: string;
  p1?: Participant;
  p2?: Participant;
  winnerId?: string;
  nextMatchId?: string;
}

interface TournamentDrawProps {
  adminContestants?: Contestant[];
}

export default function TournamentDraw({ adminContestants = [] }: TournamentDrawProps) {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('tournament_participants');
    return saved ? JSON.parse(saved) : [];
  });
  const [newName, setNewName] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleProgress, setShuffleProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('tournament_participants', JSON.stringify(participants));
  }, [participants]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const syncWithAdmin = () => {
    if (adminContestants.length === 0) {
      alert('No contestants found in Admin. Please add them first.');
      return;
    }
    const newParticipants = adminContestants.map(c => ({ id: c.id, name: c.name }));
    setParticipants(newParticipants);
    soundService.playPop();
  };

  const addParticipant = () => {
    if (!newName.trim()) return;
    setParticipants(prev => [...prev, { 
      id: Date.now().toString(), 
      name: newName.trim()
    }]);
    setNewName('');
    soundService.playPop();
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    soundService.playPop();
  };

  const generateBracket = () => {
    if (participants.length < 2) return;
    
    setIsShuffling(true);
    setIsGenerated(false);
    setShuffleProgress(0);

    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const progressTimer = setInterval(() => {
      currentStep++;
      setShuffleProgress((currentStep / steps) * 100);
      if (currentStep % 5 === 0) soundService.playTick();
      
      if (currentStep >= steps) {
        clearInterval(progressTimer);
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        const newMatches: Match[] = [];
        
        for (let i = 0; i < shuffled.length; i += 2) {
          newMatches.push({
            id: `match-${i}`,
            p1: shuffled[i],
            p2: shuffled[i + 1],
          });
        }
        
        setMatches(newMatches);
        setIsGenerated(true);
        setIsShuffling(false);
        soundService.playCorrect();
      }
    }, interval);
  };

  const resetTournament = () => {
    setMatches([]);
    setIsGenerated(false);
  };

  const copyMatchups = () => {
    const text = matches.map((m, i) => `Match ${i + 1}: ${m.p1?.name} vs ${m.p2?.name || 'BYE'}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Matchups copied to clipboard!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl midnight-royal mb-4 shadow-xl shadow-navy/20 relative">
          <Users className="w-8 h-8 text-marigold" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error animate-pulse border-2 border-white" />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-white font-poppins">Next Round Quiz</h2>
        <p className="text-white/40 font-medium tracking-[0.2em] uppercase text-[10px]">Live Selection Arena</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Participants Side */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8 space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants ({participants.length})
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={syncWithAdmin}
                  className="text-[10px] font-bold uppercase tracking-widest text-marigold hover:text-marigold/80 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Sync Admin
                </button>
                {participants.length > 0 && (
                  <button 
                    onClick={() => setParticipants([])}
                    className="text-[10px] font-bold uppercase tracking-widest text-error hover:text-error/80 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-marigold transition-colors font-medium text-sm text-white"
                  />
                </div>
                <button 
                  onClick={addParticipant}
                  className="bg-marigold text-navy p-3 rounded-xl hover:bg-marigold/90 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {participants.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-marigold/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-navy bg-marigold shadow-sm">
                        {getInitials(p.name)}
                      </div>
                      <span className="font-bold text-white text-sm">{p.name}</span>
                    </div>
                    <button 
                      onClick={() => removeParticipant(p.id)}
                      className="text-white/20 hover:text-error transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {participants.length === 0 && (
                <div className="text-center py-8 text-white/20 italic text-sm">
                  No participants added yet
                </div>
              )}
            </div>
          </div>

          <button
            onClick={generateBracket}
            disabled={participants.length < 2 || isShuffling}
            className="w-full bg-marigold text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-marigold/20 hover:bg-marigold/90 transition-all disabled:opacity-30 disabled:grayscale relative overflow-hidden"
          >
            {isShuffling ? (
              <>
                <div className="absolute inset-0 bg-navy/10">
                  <motion.div 
                    className="h-full bg-navy/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${shuffleProgress}%` }}
                  />
                </div>
                <Shuffle className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10">Scanning Arena... {Math.round(shuffleProgress)}%</span>
              </>
            ) : (
              <>
                <Shuffle className="w-5 h-5" />
                Generate Next Round
              </>
            )}
          </button>
        </motion.div>

        {/* Arena Side */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Arena Matchups
            </h3>
            <div className="flex items-center gap-3">
              {isGenerated && (
                <>
                  <button 
                    onClick={copyMatchups}
                    className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={resetTournament}
                    className="text-[10px] font-bold uppercase tracking-widest text-marigold hover:text-marigold/80 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isGenerated ? (
                <motion.div 
                  key="matches"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {matches.map((match, idx) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative"
                    >
                      <div className="glass-card overflow-hidden p-8 flex flex-col items-center gap-6 border-white/10 hover:border-marigold/30 transition-all group">
                        {/* Battle Arena Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,191,36,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-center justify-center gap-12 relative z-10 w-full">
                          {/* Participant 1 */}
                          <button
                            onClick={() => {
                              const newMatches = [...matches];
                              newMatches[idx].winnerId = match.p1?.id;
                              setMatches(newMatches);
                              soundService.playCorrect();
                            }}
                            className="flex flex-col items-center gap-4 group/p"
                          >
                            <div className={cn(
                              "w-24 h-24 rounded-full flex items-center justify-center font-black text-2xl border-4 transition-all duration-500 relative shadow-lg",
                              match.winnerId === match.p1?.id 
                                ? "bg-success border-success text-white scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)]" 
                                : "bg-navy border-marigold text-white group-hover/p:scale-105 group-hover/p:shadow-[0_0_20px_rgba(255,191,36,0.3)]"
                            )}>
                              <div className="absolute inset-1 rounded-full border border-dashed opacity-40 border-marigold" />
                              {getInitials(match.p1?.name || '')}
                              {match.winnerId === match.p1?.id && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-2 -right-2 bg-marigold p-1.5 rounded-full shadow-lg z-20"
                                >
                                  <Trophy className="w-4 h-4 text-navy" />
                                </motion.div>
                              )}
                            </div>
                            <span className={cn(
                              "font-black uppercase tracking-widest text-xs transition-colors px-3 py-1 rounded-full",
                              match.winnerId === match.p1?.id 
                                ? "bg-success text-white" 
                                : "bg-white/5 text-white"
                            )}>
                              {match.p1?.name}
                            </span>
                          </button>

                          {/* VS Element */}
                          <div className="relative flex flex-col items-center">
                            <div className="w-px h-16 bg-white/5" />
                            <motion.div 
                              animate={isShuffling ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 0.5 }}
                              className="w-12 h-12 rounded-full midnight-royal flex items-center justify-center text-marigold font-black text-xs shadow-xl shadow-black/50 z-10 my-2"
                            >
                              VS
                            </motion.div>
                            <div className="w-px h-16 bg-white/5" />
                          </div>

                          {/* Participant 2 */}
                          <button
                            onClick={() => {
                              if (!match.p2) return;
                              const newMatches = [...matches];
                              newMatches[idx].winnerId = match.p2?.id;
                              setMatches(newMatches);
                              soundService.playCorrect();
                            }}
                            disabled={!match.p2}
                            className="flex flex-col items-center gap-4 group/p"
                          >
                            <div className={cn(
                              "w-24 h-24 rounded-full flex items-center justify-center font-black text-2xl border-4 transition-all duration-500 relative shadow-lg",
                              match.winnerId === match.p2?.id 
                                ? "bg-success border-success text-white scale-110 shadow-[0_0_30_rgba(16,185,129,0.4)]" 
                                : "bg-navy border-marigold text-white group-hover/p:scale-105 group-hover/p:shadow-[0_0_20px_rgba(255,191,36,0.3)]",
                              !match.p2 && "opacity-20 grayscale shadow-none"
                            )}>
                              <div className="absolute inset-1 rounded-full border border-dashed opacity-40 border-marigold" />
                              {match.p2 ? getInitials(match.p2.name) : '?'}
                              {match.winnerId === match.p2?.id && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-2 -right-2 bg-marigold p-1.5 rounded-full shadow-lg z-20"
                                >
                                  <Trophy className="w-4 h-4 text-navy" />
                                </motion.div>
                              )}
                            </div>
                            <span className={cn(
                              "font-black uppercase tracking-widest text-xs transition-colors px-3 py-1 rounded-full",
                              match.winnerId === match.p2?.id 
                                ? "bg-success text-white" 
                                : "bg-white/5 text-white"
                            )}>
                              {match.p2?.name || <span className="opacity-30 italic">BYE</span>}
                            </span>
                          </button>
                        </div>

                        {/* Action Label */}
                        <div className="mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-marigold transition-colors">
                          {match.winnerId ? "Selected for Next Round" : "Tap to Select"}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-16 text-center space-y-4 border-dashed border-white/10 bg-transparent"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                    <Users className="w-10 h-10 text-white/10" />
                  </div>
                  <p className="text-sm font-bold text-white/30 uppercase tracking-widest max-w-[200px] mx-auto">
                    Add participants and generate the draw to enter the Arena
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
