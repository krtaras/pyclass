import { z } from "zod";

const nonEmpty = (msg: string) => z.string().trim().min(1, msg);

export const moduleCreateSchema = z.object({
  title: nonEmpty("Вкажи назву модуля.").max(120, "Назва задовга."),
});

export const moduleUpdateSchema = z.object({
  title: nonEmpty("Вкажи назву модуля.").max(120, "Назва задовга."),
});

export const lessonCreateSchema = z.object({
  moduleId: z.number().int().positive(),
  title: nonEmpty("Вкажи назву уроку.").max(160, "Назва задовга."),
});

export const lessonUpdateSchema = z.object({
  title: nonEmpty("Вкажи назву уроку.").max(160, "Назва задовга."),
  bodyMarkdown: z.string().max(50_000, "Текст задовгий."),
  videoUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  videoKind: z.enum(["youtube", "blob"]).nullable().optional(),
  blobUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const ioTestSchema = z.object({
  type: z.literal("io"),
  input: z.string().max(10_000),
  output: z.string().min(1, "Вкажи очікуваний вивід.").max(10_000),
  visible: z.boolean().optional(),
});

const assertTestSchema = z.object({
  type: z.literal("assert"),
  code: z.string().min(1, "Вкажи assert-код.").max(10_000),
  visible: z.boolean().optional(),
  label: z.string().max(200).optional(),
});

export const exerciseTestSchema = z.discriminatedUnion("type", [
  ioTestSchema,
  assertTestSchema,
]);

export const exerciseCreateSchema = z.object({
  lessonId: z.number().int().positive(),
  prompt: nonEmpty("Вкажи умову вправи.").max(4000),
});

export const exerciseUpdateSchema = z.object({
  prompt: nonEmpty("Вкажи умову вправи.").max(4000),
  starterCode: z.string().max(50_000),
  hintLimit: z.number().int().min(0).max(20),
  tests: z.array(exerciseTestSchema).min(1, "Додай хоча б один тест."),
});

export const quizCreateSchema = z.object({
  lessonId: z.number().int().positive(),
  kind: z.enum(["single", "multi", "output"]),
  prompt: nonEmpty("Вкажи текст питання.").max(2000),
});

export const quizUpdateSchema = z
  .object({
    kind: z.enum(["single", "multi", "output"]),
    prompt: nonEmpty("Вкажи текст питання.").max(2000),
    code: z
      .string()
      .max(10_000)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim() ? v : null)),
    options: z
      .array(z.string().trim().min(1, "Порожній варіант."))
      .min(2, "Потрібно щонайменше 2 варіанти.")
      .max(12),
    correct: z.union([z.string(), z.array(z.string())]),
    explanation: z.string().max(4000),
  })
  .superRefine((data, ctx) => {
    const opts = data.options;
    const correctList = Array.isArray(data.correct)
      ? data.correct
      : [data.correct];
    const normalized = correctList.map((c) => String(c).trim()).filter(Boolean);

    if (normalized.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Вкажи правильну відповідь.",
        path: ["correct"],
      });
      return;
    }

    for (const c of normalized) {
      if (!opts.includes(c)) {
        ctx.addIssue({
          code: "custom",
          message: "Правильна відповідь має бути серед варіантів.",
          path: ["correct"],
        });
        return;
      }
    }

    if (data.kind === "single" || data.kind === "output") {
      if (normalized.length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Для цього типу потрібен рівно один правильний варіант.",
          path: ["correct"],
        });
      }
    } else if (data.kind === "multi") {
      if (normalized.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Обери хоча б один правильний варіант.",
          path: ["correct"],
        });
      }
    }

    if (data.kind === "output" && !data.code) {
      ctx.addIssue({
        code: "custom",
        message: "Для питання «що виведе код» потрібен фрагмент коду.",
        path: ["code"],
      });
    }
  });

export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;
export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>;
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;

/** Normalize lesson video fields: prefer explicit blob URL when kind is blob. */
export function resolveLessonVideo(input: {
  videoUrl: string | null;
  videoKind?: "youtube" | "blob" | null;
  blobUrl?: string | null;
}): { videoUrl: string | null; videoKind: "youtube" | "blob" | null } {
  const kind = input.videoKind ?? null;
  if (kind === "blob") {
    const url = input.blobUrl ?? input.videoUrl;
    return { videoUrl: url, videoKind: url ? "blob" : null };
  }
  if (kind === "youtube") {
    return {
      videoUrl: input.videoUrl,
      videoKind: input.videoUrl ? "youtube" : null,
    };
  }
  // Infer
  const url = input.videoUrl || input.blobUrl;
  if (!url) return { videoUrl: null, videoKind: null };
  if (/\.mp4(\?|$)/i.test(url) || url.includes("blob.vercel")) {
    return { videoUrl: url, videoKind: "blob" };
  }
  return { videoUrl: url, videoKind: "youtube" };
}
