import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Moon, User, Play, RotateCcw, CheckCircle2, XCircle, Timer, Star, ChevronRight, Settings, Save, Plus, Trash2, List, Loader2, Image as ImageIcon, Upload, X, Users, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, Student, GameState, QuestionSet, Contestant } from './types';
import { cn } from './utils';
import { soundService } from './services/soundService';
import TournamentDraw from './components/TournamentDraw';


const INITIAL_SETS: QuestionSet[] = [
  {
    id: 'set-1',
    name: 'Ramadan Basics',
    type: 'NORMAL',
    questions: [
      { id: '1-1', text: "What is the pre-dawn meal before fasting called?", options: ["Iftar", "Suhoor", "Taraweeh"], correctIndex: 1 },
      { id: '1-2', text: "Which month of the Islamic calendar is Ramadan?", options: ["7th", "8th", "9th"], correctIndex: 2 },
      { id: '1-3', text: "What is the night of power called?", options: ["Laylat al-Qadr", "Eid al-Fitr", "Ashura"], correctIndex: 0 },
      { id: '1-4', text: "What do Muslims traditionally eat to break their fast?", options: ["Bread", "Dates", "Olives"], correctIndex: 1 }
    ]
  },
  {
    id: 'set-rapid-1',
    name: 'Rapid Fire: Ramadan',
    type: 'RAPID',
    questions: [
      { id: 'r-1', text: "Ramadan is the 9th month of the Islamic calendar.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-2', text: "Fasting is one of the Five Pillars of Islam.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-3', text: "The pre-dawn meal is called Iftar.", options: ["True", "False"], correctIndex: 1 },
      { id: 'r-4', text: "Laylat al-Qadr is in the last 10 days of Ramadan.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-5', text: "Muslims fast from sunrise to sunset.", options: ["True", "False"], correctIndex: 1 },
      { id: 'r-6', text: "Eid al-Fitr marks the end of Ramadan.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-7', text: "Zakat al-Fitr is given before Eid prayer.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-8', text: "The Quran was first revealed in Ramadan.", options: ["True", "False"], correctIndex: 0 },
      { id: 'r-9', text: "Taraweeh is an obligatory prayer.", options: ["True", "False"], correctIndex: 1 },
      { id: 'r-10', text: "Children are required to fast.", options: ["True", "False"], correctIndex: 1 }
    ]
  }
];

const createEmptyQuestion = (index: number, type: 'NORMAL' | 'RAPID' = 'NORMAL'): Question => ({
  id: `q-${Date.now()}-${index}`,
  text: '',
  options: type === 'RAPID' ? ['True', 'False'] : ['', '', ''],
  correctIndex: 0,
  imageUrl: undefined
});

const createEmptySet = (index: number, type: 'NORMAL' | 'RAPID' = 'NORMAL'): QuestionSet => ({
  id: `set-${Date.now()}`,
  name: `New ${type === 'RAPID' ? 'Rapid' : 'Normal'} Set ${index}`,
  type: type,
  questions: Array.from({ length: type === 'RAPID' ? 10 : 4 }, (_, i) => createEmptyQuestion(i, type))
});

export default function App() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [student, setStudent] = useState<Student>({
    name: '',
    score: 0,
    answers: [],
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(() => {
    const saved = localStorage.getItem('ramadan_quiz_sets');
    return saved ? JSON.parse(saved) : INITIAL_SETS;
  });
  const [selectedSetId, setSelectedSetId] = useState<string>(() => {
    const saved = localStorage.getItem('ramadan_quiz_sets');
    const sets = saved ? JSON.parse(saved) : INITIAL_SETS;
    return sets[0]?.id || '';
  });
  
  const selectedSet = questionSets.find(s => s.id === selectedSetId);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [gameTimerDuration, setGameTimerDuration] = useState(20);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [usedSetIds, setUsedSetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ramadan_quiz_used_sets');
    return saved ? JSON.parse(saved) : [];
  });

  const [contestants, setContestants] = useState<Contestant[]>(() => {
    const saved = localStorage.getItem('ramadan_quiz_contestants');
    return saved ? JSON.parse(saved) : [];
  });

  const [adminTab, setAdminTab] = useState<'QUESTIONS' | 'CONTESTANTS'>('QUESTIONS');

  const saveContestants = (newContestants: Contestant[]) => {
    setContestants(newContestants);
    localStorage.setItem('ramadan_quiz_contestants', JSON.stringify(newContestants));
  };

  const markSetAsUsed = (id: string) => {
    setUsedSetIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('ramadan_quiz_used_sets', JSON.stringify(next));
      return next;
    });
  };

  const resetUsedSets = () => {
    setUsedSetIds([]);
    localStorage.removeItem('ramadan_quiz_used_sets');
  };

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration?: number) => {
    stopTimer();
    const actualDuration = duration ?? gameTimerDuration;
    setTimeLeft(actualDuration);
    setIsTimerStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        
        if (next <= 5 && next > 0) {
          soundService.playWarning();
        }

        if (prev <= 1) {
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [stopTimer, gameTimerDuration]);

  const handleTimeout = useCallback(() => {
    if (!isTimerStarted) return;
    setIsTimerStarted(false);
    stopTimer();

    const selectedSet = questionSets.find(s => s.id === selectedSetId);
    const isRapid = selectedSet?.type === 'RAPID';

    if (isRapid) {
      soundService.playWrong();
      setStudent(prev => {
        const newAnswers = [...prev.answers];
        // Mark current and all subsequent unanswered questions as false
        for (let i = currentQuestionIndex; i < newAnswers.length; i++) {
          if (newAnswers[i] === null) newAnswers[i] = false;
        }
        return { ...prev, answers: newAnswers };
      });
      setGameState('RESULT');
      return;
    }

    if (isRevealing || isWaiting) return;
    
    setIsWaiting(true);
    setSelectedOption(-1);

    setTimeout(() => {
      setIsWaiting(false);
      setIsRevealing(true);
      soundService.playWrong();

      setTimeout(() => {
        setStudent(prev => {
          const newAnswers = [...prev.answers];
          newAnswers[currentQuestionIndex] = false;
          return {
            ...prev,
            answers: newAnswers,
          };
        });
        
        setShowNextButton(true);
      }, 1000);
    }, 2500);
  }, [isTimerStarted, stopTimer, questionSets, selectedSetId, isRevealing, isWaiting, currentQuestionIndex]);

  useEffect(() => {
    if (timeLeft === 0 && isTimerStarted) {
      handleTimeout();
    }
  }, [timeLeft, isTimerStarted, handleTimeout]);

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsWaiting(false);
      setIsRevealing(false);
      setShowNextButton(false);
      
      const selectedSet = questionSets.find(s => s.id === selectedSetId);
      if (selectedSet?.type === 'NORMAL') {
        setIsTimerStarted(false);
        setTimeLeft(gameTimerDuration);
      }
    } else {
      setGameState('RESULT');
      const passMark = Math.ceil(questions.length * 0.75);
      if (student.score >= passMark) {
        triggerConfetti();
      }
    }
  };

  const startNewGame = () => {
    if (!student.name.trim()) return;
    
    const selectedSet = questionSets.find(s => s.id === selectedSetId);
    if (!selectedSet) {
      alert("Please select a valid question set.");
      return;
    }

    const duration = selectedSet.type === 'RAPID' ? 50 : 20;
    setGameTimerDuration(duration);
    setTimeLeft(duration);

    markSetAsUsed(selectedSetId);
    setQuestions(selectedSet.questions);
    setGameState('PLAYING');
    setCurrentQuestionIndex(0);
    setStudent(prev => ({ ...prev, score: 0, answers: Array(selectedSet.questions.length).fill(null) }));
    setShowNextButton(false);
    
    if (selectedSet.type === 'RAPID') {
      startTimer(duration);
    } else {
      setIsTimerStarted(false);
    }
  };

  const handleSkip = () => {
    const selectedSet = questionSets.find(s => s.id === selectedSetId);
    if (selectedSet?.type === 'NORMAL') {
      stopTimer();
    }
    soundService.playPop();
    
    setStudent(prev => {
      const newAnswers = [...prev.answers];
      newAnswers[currentQuestionIndex] = false;
      return {
        ...prev,
        answers: newAnswers,
      };
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsWaiting(false);
      setIsRevealing(false);
      setShowNextButton(false);
      if (selectedSet?.type === 'NORMAL') {
        setIsTimerStarted(false);
        setTimeLeft(gameTimerDuration);
      }
    } else {
      setGameState('RESULT');
    }
  };

  const handleAnswer = (index: number) => {
    if (isRevealing || isWaiting) return;
    
    const selectedSet = questionSets.find(s => s.id === selectedSetId);
    if (selectedSet?.type === 'NORMAL') {
      stopTimer();
    }
    
    setSelectedOption(index);
    setIsWaiting(true);

    const isCorrect = index === questions[currentQuestionIndex].correctIndex;
    
    // Suspense delay
    setTimeout(() => {
      setIsWaiting(false);
      setIsRevealing(true);
      
      if (isCorrect) {
        soundService.playCorrect();
      } else {
        soundService.playWrong();
      }
      
      setTimeout(() => {
        setStudent(prev => {
          const newAnswers = [...prev.answers];
          newAnswers[currentQuestionIndex] = isCorrect;
          return {
            ...prev,
            score: isCorrect ? prev.score + 1 : prev.score,
            answers: newAnswers,
          };
        });
        setShowNextButton(selectedSet?.type !== 'RAPID');
        
        // Auto-next for RAPID fire
        if (selectedSet?.type === 'RAPID') {
          handleNext();
        }
      }, selectedSet?.type === 'RAPID' ? 1000 : 1000);
    }, selectedSet?.type === 'RAPID' ? 0 : 2500);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const [newContestant, setNewContestant] = useState<{ name: string }>({
    name: ''
  });

  const addContestant = () => {
    if (!newContestant.name.trim()) return;
    const contestant: Contestant = {
      id: `c-${Date.now()}`,
      name: newContestant.name.trim()
    };
    saveContestants([...contestants, contestant]);
    setNewContestant({ name: '' });
    soundService.playPop();
  };

  const removeContestant = (id: string) => {
    saveContestants(contestants.filter(c => c.id !== id));
    soundService.playPop();
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
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

  const resetGame = () => {
    stopTimer();
    setGameState('LOBBY');
    setStudent({ name: '', score: 0, answers: [null, null, null, null] });
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsRevealing(false);
    setShowNextButton(false);
    setIsTimerStarted(false);
    setTimeLeft(gameTimerDuration);
  };

  const saveSets = (newSets: QuestionSet[]) => {
    setQuestionSets(newSets);
    localStorage.setItem('ramadan_quiz_sets', JSON.stringify(newSets));
  };

  const handleImageUpload = (setIndex: number, qIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newSets = [...questionSets];
      newSets[setIndex].questions[qIndex].imageUrl = reader.result as string;
      saveSets(newSets);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (setIndex: number, qIndex: number) => {
    const newSets = [...questionSets];
    newSets[setIndex].questions[qIndex].imageUrl = undefined;
    saveSets(newSets);
  };

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // Circular Timer Constants
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / gameTimerDuration) * circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 p-4 relative overflow-x-hidden">
      {/* Live Indicator */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/80 border border-white/10 backdrop-blur-md shadow-sm accent-glow">
        <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Live</span>
      </div>

      {/* Navigation Tabs */}
      {(gameState === 'LOBBY' || gameState === 'TOURNAMENT') && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center p-1 bg-navy/80 border border-white/10 backdrop-blur-md rounded-2xl shadow-sm">
          <button
            onClick={() => setGameState('LOBBY')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              gameState === 'LOBBY' ? "bg-marigold text-navy shadow-lg shadow-marigold/20" : "text-white/40 hover:text-white"
            )}
          >
            <Play className="w-4 h-4" />
            Quiz
          </button>
          <button
            onClick={() => setGameState('TOURNAMENT')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              gameState === 'TOURNAMENT' ? "bg-marigold text-navy shadow-lg shadow-marigold/20" : "text-white/40 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Next Round
          </button>
        </div>
      )}

      {/* Admin Toggle */}
      {(gameState === 'LOBBY' || gameState === 'TOURNAMENT') && (
        <button 
          onClick={() => setGameState('ADMIN')}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-navy/80 border border-white/10 backdrop-blur-md shadow-sm hover:bg-navy transition-colors text-white/40 hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Decorative Icons */}
      <div className="absolute top-10 right-10 opacity-10 rotate-12">
        <Moon className="w-32 h-32 text-marigold" />
      </div>
      <div className="absolute bottom-10 left-10 opacity-10 -rotate-12">
        <Star className="w-24 h-24 text-marigold" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'TOURNAMENT' && (
          <motion.div
            key="tournament"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full relative z-10"
          >
            <TournamentDraw adminContestants={contestants} />
          </motion.div>
        )}

        {gameState === 'LOBBY' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-card p-8 space-y-8 relative z-10 neon-glow"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] midnight-royal mb-6 shadow-2xl shadow-black/50 relative accent-glow">
                <Moon className="w-12 h-12 text-marigold fill-marigold" />
                <Star className="w-5 h-5 text-marigold absolute top-5 right-5 fill-marigold opacity-50" />
              </div>
              <h1 className="text-6xl font-extrabold tracking-tighter uppercase text-white font-poppins">
                Ramadan <span className="text-marigold">Quiz</span>
              </h1>
              <p className="text-white/60 font-medium tracking-[0.2em] uppercase text-[10px]">Premium Live Trivia Experience</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Student Name</label>
                  {contestants.length > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Select below or type</span>
                  )}
                </div>
                
                {contestants.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                    {contestants.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setStudent(prev => ({ ...prev, name: c.name }));
                          soundService.playPop();
                        }}
                        className={cn(
                          "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                          student.name === c.name 
                            ? "bg-marigold border-marigold text-navy shadow-md" 
                            : "bg-white/5 border-white/10 text-white hover:border-marigold/30"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black",
                          student.name === c.name ? "bg-navy/20" : "bg-marigold text-navy"
                        )}>
                          {getInitials(c.name)}
                        </div>
                        <span className="text-[11px] font-bold truncate max-w-[80px]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Enter student name..."
                    value={student.name}
                    onChange={(e) => setStudent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-marigold transition-colors font-medium text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Select Question Set</label>
                  <button 
                    onClick={resetUsedSets}
                    className="text-[10px] font-bold uppercase tracking-widest text-marigold hover:text-marigold/80 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Used
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar py-2">
                  {questionSets.map((set) => {
                    const isUsed = usedSetIds.includes(set.id);
                    const isSelected = selectedSetId === set.id;
                    
                    return (
                      <button
                        key={set.id}
                        disabled={isUsed}
                        onClick={() => setSelectedSetId(set.id)}
                        className={cn(
                          "relative h-14 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center px-4 text-center group overflow-hidden",
                          isSelected 
                            ? "bg-marigold border-marigold text-navy shadow-[0_10px_20px_-5px_rgba(255,191,36,0.4)] scale-[1.02] z-10" 
                            : "bg-white/5 border-white/10 text-white hover:border-marigold hover:shadow-md",
                          isUsed && "opacity-50 border-error/30 bg-error/5 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "text-[12px] font-black uppercase tracking-tight leading-tight transition-all",
                          isSelected ? "scale-105" : "group-hover:scale-105",
                          isUsed && "text-error/60 line-through decoration-error decoration-2"
                        )}>
                          {set.name}
                        </span>
                        
                        {isUsed && (
                          <div className="absolute top-0 right-0 p-1">
                            <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                          </div>
                        )}
                        
                        {/* Elegant Shine effect on selected */}
                        {isSelected && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={startNewGame}
                disabled={!student.name.trim() || !selectedSetId}
                className="w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-white bg-gradient-to-br from-[#10B981] to-[#065f46] shadow-[0_20px_40px_-12px_rgba(16,185,129,0.4)] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed accent-glow border border-white/10"
              >
                <Play className="w-7 h-7 fill-white" />
                BISMILLAH
              </button>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                <span>4 Questions</span>
                <span className="text-success bg-success/10 px-3 py-1 rounded-full">3/4 to Pass</span>
                <span className="opacity-50">Elite Edition</span>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'ADMIN' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl glass-card p-8 space-y-8 relative z-10 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white font-poppins">Admin</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">Control Center</p>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setAdminTab('QUESTIONS')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      adminTab === 'QUESTIONS' ? "bg-white text-navy shadow-sm" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    Questions
                  </button>
                  <button
                    onClick={() => setAdminTab('CONTESTANTS')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      adminTab === 'CONTESTANTS' ? "bg-white text-navy shadow-sm" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    Contestants
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setGameState('LOBBY')}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/40 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {adminTab === 'QUESTIONS' ? (
              <div className="space-y-12">
                {questionSets.map((set, setIndex) => (
                  <div key={set.id} className="space-y-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 max-w-xs flex flex-col gap-2">
                        <input
                          type="text"
                          value={set.name}
                          onChange={(e) => {
                            const newSets = [...questionSets];
                            newSets[setIndex].name = e.target.value;
                            saveSets(newSets);
                          }}
                          className="text-xl font-bold text-white bg-transparent border-b border-white/10 focus:border-marigold outline-none w-full"
                          placeholder="Set Name"
                        />
                        <div className="flex gap-2">
                          <select
                            value={set.type}
                            onChange={(e) => {
                              const newSets = [...questionSets];
                              const newType = e.target.value as 'NORMAL' | 'RAPID';
                              newSets[setIndex].type = newType;
                              
                              // Adjust questions if type changes
                              if (newType === 'RAPID') {
                                newSets[setIndex].questions = Array.from({ length: 10 }, (_, i) => ({
                                  id: `q-${Date.now()}-${i}`,
                                  text: '',
                                  options: ['True', 'False'],
                                  correctIndex: 0
                                }));
                              } else {
                                newSets[setIndex].questions = Array.from({ length: 4 }, (_, i) => ({
                                  id: `q-${Date.now()}-${i}`,
                                  text: '',
                                  options: ['', '', ''],
                                  correctIndex: 0
                                }));
                              }
                              saveSets(newSets);
                            }}
                            className="bg-navy border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:border-marigold outline-none"
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="RAPID">RAPID FIRE</option>
                          </select>
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center">
                            {set.questions.length} Questions
                          </span>
                        </div>
                      </div>
                      {questionSets.length > 1 && (
                        <button 
                          onClick={() => {
                            const newSets = questionSets.filter((_, i) => i !== setIndex);
                            saveSets(newSets);
                            if (selectedSetId === set.id) setSelectedSetId(newSets[0].id);
                          }}
                          className="p-2 text-error/40 hover:text-error transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {set.questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4 relative group/q">
                          <button
                            onClick={() => {
                              const newSets = [...questionSets];
                              newSets[setIndex].questions = newSets[setIndex].questions.filter((_, i) => i !== qIndex);
                              saveSets(newSets);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover/q:opacity-100 transition-all shadow-lg z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Question {qIndex + 1}</div>
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                                  <Upload className="w-3.5 h-3.5" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageUpload(setIndex, qIndex, file);
                                    }}
                                  />
                                </label>
                                {q.imageUrl && (
                                  <button 
                                    onClick={() => removeImage(setIndex, qIndex)}
                                    className="p-1.5 rounded-lg bg-error/5 hover:bg-error/10 transition-colors text-error/40 hover:text-error"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {q.imageUrl && (
                              <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/5 mb-2">
                                <img src={q.imageUrl} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                              </div>
                            )}

                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => {
                                const newSets = [...questionSets];
                                newSets[setIndex].questions[qIndex].text = e.target.value;
                                saveSets(newSets);
                              }}
                              placeholder="Question text..."
                              className="w-full bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-marigold transition-colors font-medium text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            {q.options.map((opt, oIndex) => (
                              <div key={oIndex} className="flex gap-2 items-center">
                                <button
                                  onClick={() => {
                                    const newSets = [...questionSets];
                                    newSets[setIndex].questions[qIndex].correctIndex = oIndex;
                                    saveSets(newSets);
                                  }}
                                  className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-mono border transition-all",
                                    q.correctIndex === oIndex ? "bg-success border-success text-white" : "bg-white/5 border-white/10 text-white/30 hover:border-marigold/30"
                                  )}
                                >
                                  {String.fromCharCode(65 + oIndex)}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newSets = [...questionSets];
                                    newSets[setIndex].questions[qIndex].options[oIndex] = e.target.value;
                                    saveSets(newSets);
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                  className="flex-1 bg-white/5 border border-white/5 rounded-xl py-1.5 px-3 text-xs font-medium text-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newSets = [...questionSets];
                          newSets[setIndex].questions.push(createEmptyQuestion(newSets[setIndex].questions.length, set.type));
                          saveSets(newSets);
                        }}
                        className="p-4 rounded-2xl border border-dashed border-white/10 hover:border-marigold/30 transition-all flex flex-col items-center justify-center gap-2 text-white/20 hover:text-marigold group"
                      >
                        <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Add Question</span>
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-6 border-t border-white/5">
                  <button
                    onClick={() => {
                      const newSets = [...questionSets, createEmptySet(questionSets.length + 1)];
                      saveSets(newSets);
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Set
                  </button>
                  <button
                    onClick={() => setGameState('LOBBY')}
                    className="flex-1 midnight-royal py-4 rounded-2xl font-bold uppercase tracking-widest text-white transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Finish Editing
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="glass-card p-6 bg-white/5 border-white/10 space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Add New Contestant</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={newContestant.name}
                        onChange={(e) => setNewContestant(prev => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addContestant()}
                        placeholder="Full Name..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-marigold transition-colors font-medium text-sm text-white"
                      />
                    </div>
                    <button
                      onClick={addContestant}
                      className="bg-marigold text-navy px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-marigold/90 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {contestants.map((c) => (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-4 rounded-2xl border bg-white/5 border-white/10 hover:border-marigold/30 flex items-center gap-4 group transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm bg-marigold text-navy">
                          {getInitials(c.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{c.name}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">
                            Contestant
                          </p>
                        </div>
                        <button
                          onClick={() => removeContestant(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-error/40 hover:text-error transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {contestants.length === 0 && (
                  <div className="text-center py-20 glass-card border-dashed border-white/10 bg-transparent">
                    <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-sm font-bold text-white/30 uppercase tracking-widest">No contestants added yet</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'PLAYING' && questions.length > 0 && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md space-y-8 relative z-10 neon-glow"
          >
            {/* HUD Header */}
            <div className="grid grid-cols-3 items-center bg-navy rounded-2xl px-6 py-3 shadow-2xl shadow-black/50 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-marigold flex items-center justify-center font-bold text-navy shadow-lg text-sm">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Student</p>
                  <p className="font-bold leading-tight text-white truncate text-sm">{student.name}</p>
                </div>
              </div>

              {/* Center Timer */}
              <div className="flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="circular-timer !w-16 !h-16">
                    <svg width="64" height="64" viewBox="0 0 100 100">
                      <circle className="stroke-white/10" cx="50" cy="50" r={radius} fill="none" strokeWidth="6" />
                      <motion.circle
                        className={cn("progress", timeLeft <= 5 && "warning")}
                        cx="50"
                        cy="50"
                        r={radius}
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "linear" }}
                        fill="none"
                        strokeWidth="6"
                        strokeLinecap="round"
                        stroke={timeLeft <= 5 ? "#ef4444" : "#ffbf24"}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn(
                        "text-2xl font-bold font-mono",
                        timeLeft <= 5 ? "text-error" : "text-white"
                      )}>
                        {timeLeft}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Question</p>
                <p className="font-mono font-bold text-xl text-white">{currentQuestionIndex + 1}<span className="opacity-30">/{questions.length}</span></p>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2 justify-center">
              {student.answers.map((answer, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i === currentQuestionIndex ? "bg-white/40" : 
                    answer === true ? "bg-success" :
                    answer === false ? "bg-error" : "bg-white/5"
                  )}
                />
              ))}
            </div>

            {/* Question & Options Container with Smooth Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >
                {/* Question Card */}
                <div className="glass-card p-8 min-h-[160px] flex flex-col justify-center text-center relative overflow-hidden">
                  <AnimatePresence>
                    {isWaiting && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-navy/90 backdrop-blur-md"
                      >
                        <div className="scan-line" />
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-12 h-12 rounded-full border border-marigold/30 flex items-center justify-center"
                            >
                              <div className="w-2 h-2 rounded-full bg-marigold shadow-[0_0_10px_#ffbf24]" />
                            </motion.div>
                          </div>
                          <div className="space-y-1">
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="text-marigold font-bold uppercase tracking-[0.4em] text-[10px]"
                            >
                              Evaluating
                            </motion.p>
                            <div className="flex gap-1 justify-center">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                  className="w-1 h-1 rounded-full bg-marigold"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {questions[currentQuestionIndex] ? (
                    <h3 className="text-2xl font-bold leading-tight tracking-tight text-white font-poppins">
                      {questions[currentQuestionIndex].text}
                    </h3>
                  ) : (
                    <div className="h-8 w-3/4 bg-white/5 rounded-lg animate-pulse mx-auto" />
                  )}

                  {questions[currentQuestionIndex]?.imageUrl && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 rounded-2xl overflow-hidden border border-white/5 shadow-inner bg-white/5"
                    >
                      <img 
                        src={questions[currentQuestionIndex].imageUrl} 
                        alt="Question visual"
                        className="w-full h-48 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Options */}
                <div className={cn(
                  "grid gap-3",
                  questions[currentQuestionIndex].options.length === 2 ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {questions[currentQuestionIndex].options.map((option, i) => {
                    const isSelected = selectedOption === i;
                    const isCorrect = i === questions[currentQuestionIndex].correctIndex;
                    const showResult = isRevealing;

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={isRevealing || isWaiting || !isTimerStarted}
                        className={cn(
                          "w-full p-4 rounded-2xl text-left font-bold transition-all duration-300 border flex items-center justify-between group",
                          !showResult && !isWaiting && isTimerStarted && "bg-white/5 border-white/5 hover:bg-white/10 hover:border-marigold/20 active:scale-[0.98] text-white",
                          !showResult && !isWaiting && !isTimerStarted && "bg-white/5 border-white/5 text-white/30 cursor-not-allowed",
                          !showResult && isWaiting && isSelected && "bg-marigold border-marigold text-navy shadow-lg shadow-marigold/20 animate-pulse",
                          !showResult && isWaiting && !isSelected && "opacity-50 border-transparent text-white",
                          showResult && isSelected && isCorrect && "bg-success/10 border-success text-success",
                          showResult && isSelected && !isCorrect && "bg-error/10 border-error text-error",
                          showResult && !isSelected && isCorrect && "bg-success/5 border-success/30 text-success/40",
                          showResult && !isSelected && !isCorrect && "opacity-20 border-transparent text-white"
                        )}
                      >
                        <span className="flex items-center gap-4">
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono border transition-colors",
                            isSelected ? "bg-marigold text-navy" : "border-white/10 text-white/30 group-hover:border-marigold/20"
                          )}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {option}
                        </span>
                        {showResult && isSelected && (
                          isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Lifelines & Next Button */}
            <div className="flex gap-3">
              <AnimatePresence mode="wait">
                {!showNextButton && !isRevealing && !isWaiting && (
                  <motion.div 
                    key="action-buttons"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex gap-3 w-full"
                  >
                    <button
                      onClick={handleSkip}
                      className="flex-1 bg-error hover:bg-error/90 border border-error py-4 rounded-2xl font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-error/20"
                    >
                      <ChevronRight className="w-5 h-5" />
                      Skip
                    </button>

                    {!isTimerStarted && (
                      <button
                        onClick={() => {
                          startTimer();
                          soundService.playPop();
                        }}
                        className="flex-[2] bg-gradient-to-br from-[#10B981] to-[#065f46] hover:brightness-110 border border-white/10 py-4 rounded-2xl font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-success/20"
                      >
                        <Play className="w-5 h-5 fill-white" />
                        START
                      </button>
                    )}
                  </motion.div>
                )}

                {showNextButton && (
                    <motion.button
                      key="next-btn"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={handleNext}
                      className="flex-1 bg-marigold py-4 rounded-2xl font-bold text-navy uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-marigold/20"
                    >
                      {currentQuestionIndex < questions.length - 1 ? "Next Question" : "View Results"}
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                )}

                {timeLeft === 0 && selectedSet?.type === 'RAPID' && (
                  <motion.button
                    key="game-over-btn"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setGameState('RESULT')}
                    className="w-full py-6 rounded-2xl font-black text-xl uppercase tracking-[0.2em] text-white bg-error shadow-lg shadow-error/20"
                  >
                    GAME OVER - VIEW RESULTS
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Start Quiz Overlay Removed */}
          </motion.div>
        )}

        {gameState === 'RESULT' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-card p-10 text-center space-y-8 relative z-10 neon-glow"
          >
            <div className="space-y-4">
              <div className={cn(
                "w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-2xl",
                student.score >= Math.ceil(questions.length * 0.75) ? "midnight-royal shadow-black/50" : "bg-white/5"
              )}>
                {student.score >= Math.ceil(questions.length * 0.75) ? (
                  <Trophy className="w-12 h-12 text-marigold" />
                ) : (
                  <Moon className="w-12 h-12 text-white/20" />
                )}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-4xl font-bold uppercase tracking-tighter text-white font-poppins">
                  {student.score >= Math.ceil(questions.length * 0.75) ? "Trivia Master!" : "Ramadan Kareem!"}
                </h2>
                <p className="text-white/50 font-medium">
                  {student.name} scored <span className="text-marigold font-bold">{student.score}/{questions.length}</span>
                </p>
              </div>
            </div>

            <div className={cn(
              "grid gap-2",
              questions.length > 5 ? "grid-cols-5" : "grid-cols-4"
            )}>
              {student.answers.map((ans, i) => (
                <div key={i} className={cn(
                  "aspect-square rounded-xl flex items-center justify-center border",
                  ans === true ? "bg-success/10 border-success/30 text-success" : 
                  ans === false ? "bg-error/10 border-error/30 text-error" : "bg-white/5 border-white/10"
                )}>
                  {ans === true ? <CheckCircle2 className="w-4 h-4" /> : ans === false ? <XCircle className="w-4 h-4" /> : null}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white/60 italic">
                {student.score >= Math.ceil(questions.length * 0.75) 
                  ? "Outstanding! Your knowledge of Ramadan is truly impressive." 
                  : "A great effort! Ramadan is a time for learning and reflection."}
              </p>
              
              <button
                onClick={resetGame}
                className="w-full bg-marigold text-navy py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-marigold/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-marigold/20"
              >
                <RotateCcw className="w-5 h-5" />
                Next Student
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Branding */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none opacity-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">Ramadan Broadcast System v3.0</p>
      </div>
    </div>
  );
}
