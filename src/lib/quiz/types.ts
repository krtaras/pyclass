export type QuizKind = "single" | "multi" | "output";

export type QuizQuestion = {
  id: number;
  kind: QuizKind;
  prompt: string;
  code: string | null;
  options: string[];
  correct: string | string[];
  explanation: string;
};

export type QuizAnswer = string | string[];

export type QuizCheckResult = {
  isCorrect: boolean;
  /** Normalized correct answer(s) for highlighting. */
  correctOptions: string[];
};

/** Seam for step 4 — called once per question after submit. */
export type QuizAttemptPayload = {
  questionId: number;
  answer: QuizAnswer;
  isCorrect: boolean;
};
