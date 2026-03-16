import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Star, Calculator, User, CheckCircle2, Award, Crown, PartyPopper, Plus, Trash2 } from 'lucide-react';
import { Contestant, FinalScore } from '../types';
import { cn } from '../utils';
import { soundService } from '../services/soundService';
import confetti from 'canvas-confetti';

interface FinalRoundProps {
  contestants: Contestant[];
  onAddContestant: (name: string) => void;
  onRemoveContestant: (id: string) => void;
  onBack: () => void;
}

export default function FinalRound({ contestants, onAddContestant, onRemoveContestant, onBack }: FinalRoundProps) {
  const [newContestantName, setNewContestantName] = useState('');
  const [scores, setScores] = useState<FinalScore[]>(() => 
    contestants.map(c => ({ contestantId: c.id, normalScore: 0, rapidScore: 0 }))
  );
  const [showResults, setShowResults] = useState(false);

  // Sync scores when contestants change
  React.useEffect(() => {
    setScores(prev => {
      const newScores = [...prev];
      contestants.forEach(c => {
        if (!newScores.find(s => s.contestantId === c.id)) {
          newScores.push({ contestantId: c.id, normalScore: 0, rapidScore: 0 });
        }
      });
      return newScores.filter(s => contestants.find(c => c.id === s.contestantId));
    });
  }, [contestants]);

  const handleAdd = () => {
    if (!newContestantName.trim()) return;
    onAddContestant(newContestantName);
    setNewContestantName('');
    soundService.playPop();
  };

  const updateScore = (contestantId: string, field: 'normalScore' | 'rapidScore', value: number) => {
    setScores(prev => prev.map(s => 
      s.contestantId === contestantId ? { ...s, [field]: value } : s
    ));
    soundService.playPop();
  };

  const results = useMemo(() => {
    const calculated = scores.map(s => {
      const contestant = contestants.find(c => c.id === s.contestantId);
      const totalScore = s.normalScore + (s.rapidScore / 2);
      return {
        ...s,
        name: contestant?.name || 'Unknown',
        totalScore
      };
    });

    return calculated.sort((a, b) => b.totalScore - a.totalScore);
  }, [scores, contestants]);

  const handleCalculate = () => {
    setShowResults(true);
    soundService.playCorrect();
    
    // Trigger confetti for the winner
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-marigold/10 border border-marigold/20 text-marigold"
        >
          <Crown className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-[0.2em]">Grand Finale</span>
        </motion.div>
        <h2 className="text-5xl font-black text-white uppercase tracking-tighter">
          Final <span className="text-marigold">Leaderboard</span>
        </h2>
        <p className="text-white/40 max-w-lg mx-auto">
          Record the scores for the final round. Normal questions count as 1 point, Quickfire questions count as 0.5 points.
        </p>
      </div>

      {/* Registration Section */}
      <div className="glass-card p-4 bg-white/5 border-white/10">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={newContestantName}
              onChange={(e) => setNewContestantName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add finalist name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-marigold transition-colors font-medium text-sm text-white placeholder:text-white/20"
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-marigold text-navy px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-marigold/90 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Finalist
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {contestants.map((contestant, idx) => {
          const score = scores.find(s => s.contestantId === contestant.id) || { normalScore: 0, rapidScore: 0 };
          return (
            <motion.div
              key={contestant.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 group hover:border-marigold/30 transition-all relative"
            >
              <button
                onClick={() => onRemoveContestant(contestant.id)}
                className="absolute top-2 right-2 md:top-4 md:right-4 p-2 text-error/20 hover:text-error transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[180px]">
                <div className="w-10 h-10 rounded-xl midnight-royal flex items-center justify-center text-marigold font-black shadow-lg text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white leading-tight truncate">{contestant.name}</h3>
                  <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">Finalist</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-1 flex-wrap gap-4 md:gap-8 items-center md:items-start justify-center md:justify-end w-full">
                {/* Normal Score */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-marigold shadow-[0_0_8px_rgba(255,191,36,0.4)]" />
                    <label className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] block">Set 1: Normal</label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 1, 2, 3, 4].map(val => (
                      <button
                        key={val}
                        onClick={() => updateScore(contestant.id, 'normalScore', val)}
                        className={cn(
                          "w-10 h-10 rounded-xl font-black text-base transition-all border-2",
                          score.normalScore === val 
                            ? "bg-marigold text-navy border-marigold shadow-[0_0_15px_rgba(255,191,36,0.2)] scale-105 z-10" 
                            : "bg-white/5 text-white/60 border-white/10 hover:border-marigold/30 hover:bg-white/10"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rapid Score */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <label className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] block">Set 2: Quickfire</label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(val => (
                      <button
                        key={val}
                        onClick={() => updateScore(contestant.id, 'rapidScore', val)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-sm font-black transition-all border-2",
                          score.rapidScore === val 
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105 z-10" 
                            : "bg-white/5 text-white/60 border-white/10 hover:border-emerald-500/30 hover:bg-white/10"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleCalculate}
          disabled={showResults}
          className="group relative px-12 py-6 bg-marigold rounded-3xl font-black text-xl text-navy uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(255,191,36,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            Calculate Winner
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pt-12"
          >
            <div className="text-center">
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">Final <span className="text-marigold">Standings</span></h3>
            </div>

            <div className="grid gap-4">
              {results.map((res, idx) => (
                <motion.div
                  key={res.contestantId}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className={cn(
                    "relative p-8 rounded-[2.5rem] border flex items-center justify-between overflow-hidden",
                    idx === 0 
                      ? "bg-gradient-to-br from-marigold to-orange-600 border-white/20 text-navy shadow-2xl shadow-marigold/20" 
                      : "glass-card border-white/10 text-white"
                  )}
                >
                  {idx === 0 && (
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                      <Crown className="w-32 h-32 -rotate-12" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 relative z-10">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl",
                      idx === 0 ? "bg-white/20" : "midnight-royal text-marigold"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black uppercase tracking-tight">{res.name}</h4>
                      <div className="flex gap-4 mt-1">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", idx === 0 ? "text-navy/90" : "text-white/80")}>
                          Normal: {res.normalScore}
                        </span>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", idx === 0 ? "text-navy/90" : "text-white/80")}>
                          Quickfire: {res.rapidScore} (x0.5)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right relative z-10">
                    <div className="text-4xl font-black tracking-tighter">{res.totalScore}</div>
                    <div className={cn("text-[10px] font-black uppercase tracking-widest", idx === 0 ? "text-navy/90" : "text-white/80")}>
                      Total Points
                    </div>
                  </div>

                  {idx === 0 && (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-10"
                    >
                      <Trophy className="w-48 h-48" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowResults(false)}
                className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
              >
                Edit Scores
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
