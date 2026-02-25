export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuestionSet {
  id: string;
  name: string;
  questions: Question[];
}

export interface Student {
  name: string;
  score: number;
  answers: (boolean | null)[];
}

export type GameState = 'LOBBY' | 'PLAYING' | 'RESULT' | 'ADMIN';
