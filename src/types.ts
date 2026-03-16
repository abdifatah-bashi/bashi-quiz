export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  imageUrl?: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  type: 'NORMAL' | 'RAPID';
  questions: Question[];
  isUsed?: boolean;
}

export interface Student {
  name: string;
  score: number;
  answers: (boolean | null)[];
}

export interface Contestant {
  id: string;
  name: string;
}

export interface FinalScore {
  contestantId: string;
  normalScore: number;
  rapidScore: number;
}

export type GameState = 'LOBBY' | 'PLAYING' | 'RESULT' | 'ADMIN' | 'TOURNAMENT' | 'FINAL';
