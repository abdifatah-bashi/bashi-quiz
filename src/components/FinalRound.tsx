import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Plus, Minus, X, Sparkles, RotateCcw } from 'lucide-react';
import { Contestant, FinalScore } from '../types';
import { cn } from '../utils';
import { soundService } from '../services/soundService';
import confetti from 'canvas-confetti';

const MAX_NORMAL = 4;
const MAX_RAPID = 8;

interface FinalRoundProps {
  contestants: Contestant[];
  onAddContestant: (name: string) => void;
  onRemoveContestant: (id: string) => void;
  onBack: () => void;
}

const totalOf = (s: FinalScore) => s.normalScore + s.rapidScore / 2;

interface StepperProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, max, onChange }: StepperProps) {
  const buttonClass = "w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:hover:bg-transparent";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
        <button onClick={() => onChange(value - 1)} disabled={value <= 0} className={buttonClass}>
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center text-lg font-black text-white tabular-nums">{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={value >= max} className={buttonClass}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function FinalRound({ contestants, onAddContestant, onRemoveContestant }: FinalRoundProps) {
  const [newContestantName, setNewContestantName] = useState('');
  const [scores, setScores] = useState<FinalScore[]>(() =>
    contestants.map(c => ({ contestantId: c.id, normalScore: 0, rapidScore: 0 }))
  );
  const [showResults, setShowResults] = useState(false);

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

  const scoreFor = (id: string): FinalScore =>
    scores.find(s => s.contestantId === id) || { contestantId: id, normalScore: 0, rapidScore: 0 };

  const results = useMemo(() =>
    contestants
      .map(c => ({ ...scoreFor(c.id), name: c.name, totalScore: totalOf(scoreFor(c.id)) }))
      .sort((a, b) => b.totalScore - a.totalScore),
    [scores, contestants]
  );

  const leaderId = results[0]?.totalScore > 0 ? results[0].contestantId : null;
  const [winner, ...runnersUp] = results;

  const handleReveal = () => {
    setShowResults(true);
    soundService.playCorrect();

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
    <div className="w-full max-w-2xl mx-auto pb-20">
      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div
            key="scoring"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <p className="text-marigold text-xs font-black uppercase tracking-[0.3em]">Grand Finale</p>
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter">The Final</h2>
              <p className="text-white/40 text-sm">Normal = 1 pt &middot; Quickfire = ½ pt</p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={newContestantName}
                onChange={(e) => setNewContestantName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Add a finalist..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 focus:outline-none focus:border-marigold transition-colors font-medium text-white placeholder:text-white/30"
              />
              <button
                onClick={handleAdd}
                disabled={!newContestantName.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-marigold text-navy flex items-center justify-center hover:bg-marigold/90 transition-all active:scale-95 disabled:opacity-30"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {contestants.length === 0 ? (
              <p className="text-center text-white/30 py-12">Add your finalists to get started.</p>
            ) : (
              <div className="space-y-3">
                {contestants.map((contestant, idx) => {
                  const score = scoreFor(contestant.id);
                  const isLeader = contestant.id === leaderId;
                  return (
                    <motion.div
                      key={contestant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "group relative flex flex-wrap items-center gap-4 sm:gap-6 p-4 pr-12 rounded-2xl border transition-colors",
                        isLeader ? "bg-marigold/10 border-marigold/40" : "bg-white/[0.03] border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-[140px]">
                        {isLeader && <Crown className="w-5 h-5 text-marigold shrink-0" />}
                        <h3 className="text-lg font-bold text-white truncate">{contestant.name}</h3>
                      </div>

                      <Stepper
                        label="Normal"
                        value={score.normalScore}
                        max={MAX_NORMAL}
                        onChange={(v) => updateScore(contestant.id, 'normalScore', v)}
                      />
                      <Stepper
                        label="Quickfire"
                        value={score.rapidScore}
                        max={MAX_RAPID}
                        onChange={(v) => updateScore(contestant.id, 'rapidScore', v)}
                      />

                      <div className="w-14 text-right">
                        <div className={cn("text-3xl font-black tabular-nums", isLeader ? "text-marigold" : "text-white")}>
                          {totalOf(score)}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">pts</div>
                      </div>

                      <button
                        onClick={() => onRemoveContestant(contestant.id)}
                        className="absolute top-3 right-3 p-1 text-white/20 hover:text-error transition-all md:opacity-0 md:group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {contestants.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleReveal}
                  className="px-10 py-5 bg-marigold rounded-2xl font-black text-lg text-navy uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(248,107,66,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <Sparkles className="w-5 h-5" />
                  Reveal Winner
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {winner && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="text-center space-y-4 py-8"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex w-24 h-24 rounded-[2rem] midnight-royal items-center justify-center accent-glow"
                >
                  <Crown className="w-12 h-12 text-navy" />
                </motion.div>
                <p className="text-marigold text-xs font-black uppercase tracking-[0.3em]">Champion</p>
                <h2 className="text-6xl font-black text-white uppercase tracking-tighter">{winner.name}</h2>
                <p className="text-2xl font-black text-marigold tabular-nums">{winner.totalScore} pts</p>
              </motion.div>
            )}

            {runnersUp.length > 0 && (
              <div className="space-y-2">
                {runnersUp.map((res, idx) => (
                  <motion.div
                    key={res.contestantId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10"
                  >
                    <span className="w-6 text-white/30 font-black tabular-nums">{idx + 2}</span>
                    <span className="flex-1 font-bold text-white truncate">{res.name}</span>
                    <span className="font-black text-white tabular-nums">{res.totalScore}</span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setShowResults(false)}
                className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Edit Scores
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
