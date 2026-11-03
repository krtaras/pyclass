"use client";

import { useCallback } from "react";
import { ExercisePanel } from "./ExercisePanel";
import { QuizPanel } from "./QuizPanel";
import type { ExerciseTest, SubmissionPayload } from "@/lib/python/types";
import type {
  QuizAttemptPayload,
  QuizQuestion,
  QuizAnswer,
} from "@/lib/quiz/types";

export type SavedQuizAttempt = {
  questionId: number;
  answer: QuizAnswer;
  isCorrect: boolean;
};

type ExerciseView = {
  id: number;
  prompt: string;
  starterCode: string;
  tests: ExerciseTest[];
  initialCode?: string;
};

export function LessonInteractive({
  exercises,
  questions,
  savedAttempts,
}: {
  exercises: ExerciseView[];
  questions: QuizQuestion[];
  savedAttempts: SavedQuizAttempt[];
}) {
  const persistSubmission = useCallback(async (payload: SubmissionPayload) => {
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Persistence failure shouldn't block the UI feedback.
    }
  }, []);

  const persistAttempt = useCallback(async (payload: QuizAttemptPayload) => {
    try {
      await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: payload.questionId,
          answer: payload.answer,
        }),
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      {exercises.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500">
          У цьому уроці ще немає вправ.
        </p>
      ) : (
        exercises.map((ex) => (
          <ExercisePanel
            key={ex.id}
            exerciseId={ex.id}
            prompt={ex.prompt}
            starterCode={ex.starterCode}
            tests={ex.tests}
            initialCode={ex.initialCode}
            onCheckComplete={persistSubmission}
          />
        ))
      )}

      <QuizPanel
        questions={questions}
        initialAttempts={savedAttempts}
        onAttempt={persistAttempt}
      />
    </>
  );
}
