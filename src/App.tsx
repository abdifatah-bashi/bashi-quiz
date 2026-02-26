import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Moon, User, Play, RotateCcw, CheckCircle2, XCircle, Timer, Star, ChevronRight, Settings, Save, Plus, Trash2, List, Loader2, Image as ImageIcon, Upload, X, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, Student, GameState, QuestionSet } from './types';
import { cn } from './utils';
import { soundService } from './services/soundService';

const COUNTDOWN_TIME = 20;

const INITIAL_SETS: QuestionSet[] = [
  {
    id: 'set-1',
    name: 'Ramadan Basics',
    questions: [
      { id: '1-1', text: "What is the pre-dawn meal before fasting called?", options: ["Iftar", "Suhoor", "Taraweeh"], correctIndex: 1 },
      { id: '1-2', text: "Which month of the Islamic calendar is Ramadan?", options: ["7th", "8th", "9th"], correctIndex: 2 },
      { id: '1-3', text: "What is the night of power called?", options: ["Laylat al-Qadr", "Eid al-Fitr", "Ashura"], correctIndex: 0 },
      { id: '1-4', text: "What do Muslims traditionally eat to break their fast?", options: ["Bread", "Dates", "Olives"], correctIndex: 1 }
    ]
  }
];

const createEmptyQuestion = (index: number): Question => ({
  id: `q-${Date.now()}-${index}`,
  text: '',
  options: ['', '', ''],
  correctIndex: 0,
  imageUrl: undefined
});

const createEmptySet = (index: number): QuestionSet => ({
  id: `set-${Date.now()}`,
  name: `New Set ${index}`,
  questions: Array.from({ length: 4 }, (_, i) => createEmptyQuestion(i))
});

export default function App() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [student, setStudent] = useState<Student>({
    name: '',
    score: 0,
    answers: [null, null, null, null],
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
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TIME);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAudienceActive, setIsAudienceActive] = useState(false);
  const [audienceTimeLeft, setAudienceTimeLeft] = useState(30);
  const audienceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAudienceTimer = () => {
    stopTimer();
    setIsAudienceActive(true);
    setAudienceTimeLeft(30);
    
    if (audienceTimerRef.current) clearInterval(audienceTimerRef.current);
    
    audienceTimerRef.current = setInterval(() => {
      setAudienceTimeLeft(prev => {
        if (prev <= 1) {
          if (audienceTimerRef.current) clearInterval(audienceTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeAudienceTimer = () => {
    setIsAudienceActive(false);
    if (audienceTimerRef.current) clearInterval(audienceTimerRef.current);
  };

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(COUNTDOWN_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        
        if (next <= 5 && next > 0) {
          soundService.playWarning();
        } else if (next > 5) {
          // Optional: play a very soft tick for every second? 
          // User asked for "after 5 seconds remaining", so let's stick to that.
        }

        if (prev <= 1) {
          stopTimer();
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [stopTimer]);

  const handleTimeout = () => {
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
  };

  const handleNext = () => {
    if (currentQuestionIndex < 3) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsWaiting(false);
      setIsRevealing(false);
      setShowNextButton(false);
      startTimer();
    } else {
      setGameState('RESULT');
      if (student.score >= 3) {
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

    setQuestions(selectedSet.questions);
    setGameState('PLAYING');
    setCurrentQuestionIndex(0);
    setStudent(prev => ({ ...prev, score: 0, answers: [null, null, null, null] }));
    setShowNextButton(false);
    startTimer();
  };

  const handleAnswer = (index: number) => {
    if (isRevealing || isWaiting) return;
    stopTimer();
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
        setShowNextButton(true);
      }, 1000);
    }, 2500);
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
    setTimeLeft(COUNTDOWN_TIME);
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
  const offset = circumference - (timeLeft / COUNTDOWN_TIME) * circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 p-4 relative overflow-hidden">
      {/* Live Indicator */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-navy/10 backdrop-blur-md shadow-sm accent-glow">
        <div className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-navy/80">Live</span>
      </div>

      {/* Admin Toggle */}
      {gameState === 'LOBBY' && (
        <button 
          onClick={() => setGameState('ADMIN')}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/80 border border-navy/10 backdrop-blur-md shadow-sm hover:bg-white transition-colors text-navy/40 hover:text-navy"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Decorative Icons */}
      <div className="absolute top-10 right-10 opacity-5 rotate-12">
        <Moon className="w-32 h-32 text-navy" />
      </div>
      <div className="absolute bottom-10 left-10 opacity-5 -rotate-12">
        <Star className="w-24 h-24 text-navy" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'LOBBY' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-card p-8 space-y-8 relative z-10 neon-glow"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] midnight-royal mb-6 shadow-2xl shadow-navy/20 relative accent-glow">
                <Moon className="w-12 h-12 text-white fill-white" />
                <Star className="w-5 h-5 text-white absolute top-5 right-5 fill-white opacity-50" />
              </div>
              <h1 className="text-6xl font-extrabold tracking-tighter uppercase text-navy font-poppins">
                Ramadan <span className="text-navy/30">Quiz</span>
              </h1>
              <p className="text-navy/40 font-medium tracking-[0.2em] uppercase text-[10px]">Premium Live Trivia Experience</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-navy/40 ml-1">Student Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy/30" />
                  <input
                    type="text"
                    placeholder="Enter student name..."
                    value={student.name}
                    onChange={(e) => setStudent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-navy/5 border border-navy/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-steel transition-colors font-medium text-navy placeholder:text-navy/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-navy/40 ml-1">Select Question Set</label>
                <div className="relative">
                  <List className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy/30" />
                  <select
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                    className="w-full bg-navy/5 border border-navy/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-steel transition-colors font-medium appearance-none text-navy"
                  >
                    {questionSets.map(set => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={startNewGame}
                disabled={!student.name.trim() || !selectedSetId}
                className="w-full glass-button py-6 rounded-2xl font-extrabold text-xl uppercase tracking-[0.15em] flex items-center justify-center gap-3 text-marigold"
              >
                <Play className="w-6 h-6 fill-current" />
                Start Trivia
              </button>
            </div>

            <div className="pt-6 border-t border-navy/5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-navy/30">
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
            <div className="flex items-center justify-between border-b border-navy/5 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-navy font-poppins">Trivia Manager</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-navy/40">Manage your question sets</p>
              </div>
              <button 
                onClick={() => setGameState('LOBBY')}
                className="p-2 rounded-xl hover:bg-navy/5 transition-colors text-navy/40 hover:text-navy"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-12">
              {questionSets.map((set, setIndex) => (
                <div key={set.id} className="space-y-6 p-6 rounded-3xl bg-navy/5 border border-navy/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-xs">
                      <input
                        type="text"
                        value={set.name}
                        onChange={(e) => {
                          const newSets = [...questionSets];
                          newSets[setIndex].name = e.target.value;
                          saveSets(newSets);
                        }}
                        className="text-xl font-bold text-navy bg-transparent border-b border-navy/10 focus:border-navy outline-none w-full"
                        placeholder="Set Name"
                      />
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
                      <div key={q.id} className="p-4 rounded-2xl bg-white border border-navy/5 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-navy/30">Question {qIndex + 1}</div>
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer p-1.5 rounded-lg bg-navy/5 hover:bg-navy/10 transition-colors text-navy/40 hover:text-navy">
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
                            <div className="relative w-full h-24 rounded-xl overflow-hidden border border-navy/5 mb-2">
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
                            className="w-full bg-navy/5 border border-navy/5 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-navy/20 font-medium text-navy"
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
                                  q.correctIndex === oIndex ? "bg-success border-success text-white" : "bg-white border-navy/10 text-navy/30 hover:border-navy/30"
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
                                className="flex-1 bg-navy/5 border border-navy/5 rounded-xl py-1.5 px-3 text-xs font-medium text-navy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 border-t border-navy/5">
              <button
                onClick={() => {
                  const newSets = [...questionSets, createEmptySet(questionSets.length + 1)];
                  saveSets(newSets);
                }}
                className="flex-1 bg-navy/5 hover:bg-navy/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-navy transition-colors flex items-center justify-center gap-2"
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
            <div className="grid grid-cols-3 items-center bg-navy rounded-2xl px-6 py-3 shadow-2xl shadow-navy/40 border border-white/5">
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
                        stroke={timeLeft <= 5 ? "#ef4444" : "#FACC15"}
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
                <p className="font-mono font-bold text-xl text-white">{currentQuestionIndex + 1}<span className="opacity-30">/4</span></p>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2 justify-center">
              {student.answers.map((answer, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i === currentQuestionIndex ? "bg-navy/40" : 
                    answer === true ? "bg-success" :
                    answer === false ? "bg-error" : "bg-navy/5"
                  )}
                />
              ))}
            </div>

            {/* Question Card */}
            <motion.div
              key={currentQuestionIndex}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="glass-card p-8 min-h-[160px] flex flex-col justify-center text-center relative overflow-hidden"
            >
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
                          <div className="w-2 h-2 rounded-full bg-marigold shadow-[0_0_10px_#FACC15]" />
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

              <h3 className="text-2xl font-bold leading-tight tracking-tight text-navy font-poppins">
                {questions[currentQuestionIndex].text}
              </h3>

              {questions[currentQuestionIndex].imageUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-2xl overflow-hidden border border-navy/5 shadow-inner bg-navy/5"
                >
                  <img 
                    src={questions[currentQuestionIndex].imageUrl} 
                    alt="Question visual"
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Options */}
            <div className="grid gap-3">
              {questions[currentQuestionIndex].options.map((option, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === questions[currentQuestionIndex].correctIndex;
                const showResult = isRevealing;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={isRevealing || isWaiting}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left font-bold transition-all duration-300 border flex items-center justify-between group",
                      !showResult && !isWaiting && "bg-white/50 border-navy/5 hover:bg-white hover:border-navy/20 active:scale-[0.98] text-navy",
                      !showResult && isWaiting && isSelected && "bg-navy border-navy text-marigold shadow-lg shadow-navy/20 animate-pulse",
                      !showResult && isWaiting && !isSelected && "opacity-50 border-transparent text-navy",
                      showResult && isSelected && isCorrect && "bg-success/10 border-success text-success",
                      showResult && isSelected && !isCorrect && "bg-error/10 border-error text-error",
                      showResult && !isSelected && isCorrect && "bg-success/5 border-success/30 text-success/40",
                      showResult && !isSelected && !isCorrect && "opacity-20 border-transparent text-navy"
                    )}
                  >
                    <span className="flex items-center gap-4">
                      <span className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono border transition-colors",
                        isSelected ? "bg-navy text-white" : "border-navy/10 text-navy/30 group-hover:border-navy/20"
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

            {/* Lifelines & Next Button */}
            <div className="flex gap-3">
              <AnimatePresence mode="wait">
                {!showNextButton && !isRevealing && !isWaiting && (
                  <motion.button
                    key="audience-btn"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={startAudienceTimer}
                    className="flex-1 bg-marigold hover:bg-marigold/90 border border-marigold py-4 rounded-2xl font-bold text-navy uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-marigold/20"
                  >
                    <Users className="w-5 h-5" />
                    i badbaadiya
                  </motion.button>
                )}

                {showNextButton && (
                  <motion.button
                    key="next-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={handleNext}
                    className="flex-1 bg-navy py-4 rounded-2xl font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-navy/20"
                  >
                    {currentQuestionIndex < 3 ? "Next Question" : "View Results"}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Audience Timer Overlay */}
            <AnimatePresence>
              {isAudienceActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy/95 backdrop-blur-xl"
                >
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="scan-line opacity-20" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.05)_0%,transparent_70%)]" />
                  </div>

                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-sm glass-card p-10 text-center space-y-8 relative border-marigold/20"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl midnight-royal flex items-center justify-center shadow-lg shadow-navy/40">
                          <Users className="w-8 h-8 text-marigold" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-navy font-poppins uppercase tracking-tight">i badbaadiya</h2>
                      <p className="text-xs font-bold text-navy/40 uppercase tracking-[0.2em]">Lifeline Active</p>
                    </div>

                    <div className="relative py-8">
                      <div className="text-7xl font-black font-mono text-navy tabular-nums">
                        {audienceTimeLeft}
                        <span className="text-xl opacity-20 ml-1">s</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-6 h-1.5 w-full bg-navy/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-marigold"
                          initial={{ width: "100%" }}
                          animate={{ width: `${(audienceTimeLeft / 30) * 100}%` }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </div>
                    </div>

                    <p className="text-sm font-medium text-navy/60 leading-relaxed">
                      The audience is now voting. <br/>
                      <span className="text-navy font-bold">Please wait for the results...</span>
                    </p>

                    <button
                      onClick={closeAudienceTimer}
                      className="w-full bg-navy text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-navy/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
                    >
                      <X className="w-5 h-5" />
                      Close & Answer
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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
                student.score >= 3 ? "midnight-royal shadow-navy/20" : "bg-navy/5"
              )}>
                {student.score >= 3 ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <Moon className="w-12 h-12 text-navy/20" />
                )}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-4xl font-bold uppercase tracking-tighter text-navy font-poppins">
                  {student.score >= 3 ? "Trivia Master!" : "Ramadan Kareem!"}
                </h2>
                <p className="text-navy/50 font-medium">
                  {student.name} scored <span className="text-navy font-bold">{student.score}/4</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {student.answers.map((ans, i) => (
                <div key={i} className={cn(
                  "aspect-square rounded-xl flex items-center justify-center border",
                  ans === true ? "bg-success/10 border-success/30 text-success" : 
                  ans === false ? "bg-error/10 border-error/30 text-error" : "bg-navy/5 border-navy/10"
                )}>
                  {ans === true ? <CheckCircle2 className="w-5 h-5" /> : ans === false ? <XCircle className="w-5 h-5" /> : null}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-navy/60 italic">
                {student.score >= 3 
                  ? "Outstanding! Your knowledge of Ramadan is truly impressive." 
                  : "A great effort! Ramadan is a time for learning and reflection."}
              </p>
              
              <button
                onClick={resetGame}
                className="w-full bg-navy text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-navy/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
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
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-navy">Ramadan Broadcast System v3.0</p>
      </div>
    </div>
  );
}
