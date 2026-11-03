export type ExerciseProgressInput = {
  exerciseId: number;
  /** True when the student has at least one fully passing submission. */
  solved: boolean;
};

export type QuizProgressInput = {
  questionId: number;
  /** True when the student has answered (any attempt exists). */
  answered: boolean;
  /** True when their latest/best attempt is correct. */
  correct: boolean;
};

export type LessonProgressInput = {
  lessonId: number;
  exercises: ExerciseProgressInput[];
  quizQuestions: QuizProgressInput[];
};

export type LessonProgress = {
  lessonId: number;
  exerciseSolved: number;
  exerciseTotal: number;
  quizCorrect: number;
  quizAnswered: number;
  quizTotal: number;
  complete: boolean;
  /** 0–100 overall percent for the lesson. */
  percent: number;
};

export type CourseProgress = {
  lessons: LessonProgress[];
  lessonsComplete: number;
  lessonsTotal: number;
  percent: number;
};
