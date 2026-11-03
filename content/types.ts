import type { ExerciseTest } from "../src/lib/python/types";
import type { QuizKind } from "../src/lib/quiz/types";

export type ContentExercise = {
  slug: string;
  prompt: string;
  starterCode: string;
  hintLimit?: number;
  tests: ExerciseTest[];
  /** Shown in lesson markdown as «приклад». Not a solution. */
  exampleIo?: { input: string; output: string };
};

export type ContentQuiz = {
  slug: string;
  kind: QuizKind;
  prompt: string;
  code?: string | null;
  options: string[];
  correct: string | string[];
  explanation: string;
};

export type ContentLesson = {
  slug: string;
  order: number;
  title: string;
  bodyMarkdown: string;
  /** Verified YouTube watch URL, or null if none. */
  videoUrl: string | null;
  exercises: ContentExercise[];
  quizzes: ContentQuiz[];
};

export type ContentModule = {
  slug: string;
  order: number;
  title: string;
  lessons: ContentLesson[];
};
