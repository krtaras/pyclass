import { describe, expect, it } from "vitest";
import {
  computeCourseProgress,
  computeLessonProgress,
  isExerciseSolved,
} from "./progress";

describe("isExerciseSolved", () => {
  it("requires all tests passed", () => {
    expect(isExerciseSolved(2, 2)).toBe(true);
    expect(isExerciseSolved(1, 2)).toBe(false);
    expect(isExerciseSolved(0, 0)).toBe(false);
  });
});

describe("computeLessonProgress", () => {
  it("marks complete only when exercises solved and quizzes answered", () => {
    const incomplete = computeLessonProgress({
      lessonId: 1,
      exercises: [{ exerciseId: 1, solved: true }],
      quizQuestions: [
        { questionId: 1, answered: true, correct: true },
        { questionId: 2, answered: false, correct: false },
      ],
    });
    expect(incomplete.complete).toBe(false);
    expect(incomplete.exerciseSolved).toBe(1);
    expect(incomplete.quizAnswered).toBe(1);
    expect(incomplete.quizCorrect).toBe(1);

    const complete = computeLessonProgress({
      lessonId: 1,
      exercises: [{ exerciseId: 1, solved: true }],
      quizQuestions: [
        { questionId: 1, answered: true, correct: false },
        { questionId: 2, answered: true, correct: true },
      ],
    });
    expect(complete.complete).toBe(true);
    expect(complete.quizCorrect).toBe(1);
    expect(complete.percent).toBe(100);
  });

  it("treats empty lesson as complete", () => {
    const p = computeLessonProgress({
      lessonId: 9,
      exercises: [],
      quizQuestions: [],
    });
    expect(p.complete).toBe(true);
    expect(p.percent).toBe(100);
  });
});

describe("computeCourseProgress", () => {
  it("aggregates lesson completion", () => {
    const course = computeCourseProgress([
      {
        lessonId: 1,
        exercises: [{ exerciseId: 1, solved: true }],
        quizQuestions: [{ questionId: 1, answered: true, correct: true }],
      },
      {
        lessonId: 2,
        exercises: [{ exerciseId: 2, solved: false }],
        quizQuestions: [{ questionId: 2, answered: false, correct: false }],
      },
    ]);
    expect(course.lessonsComplete).toBe(1);
    expect(course.lessonsTotal).toBe(2);
    expect(course.percent).toBe(50);
  });
});
