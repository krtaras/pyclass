import { generateText } from "ai";
import {
  looksLikeSolutionCode,
  SAFE_GENERIC_HINT_UK,
  STRICT_RETRY_PROMPT_UK,
  SYSTEM_PROMPT_UK,
} from "./filter";

export const HINT_MODEL =
  process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5-nano";

export type HintContext = {
  exercisePrompt: string;
  studentCode: string;
  /** Visible check summary only — never hidden test source. */
  lastCheckSummary: string | null;
};

function buildUserPrompt(ctx: HintContext, stricter = false): string {
  const parts = [
    `Завдання:\n${ctx.exercisePrompt}`,
    `Код учня:\n${ctx.studentCode || "(порожньо)"}`,
  ];
  if (ctx.lastCheckSummary) {
    parts.push(`Останній результат перевірки (без прихованих тестів):\n${ctx.lastCheckSummary}`);
  }
  parts.push(
    stricter
      ? STRICT_RETRY_PROMPT_UK
      : "Дай коротку підказку без розв'язку.",
  );
  return parts.join("\n\n");
}

/**
 * Generate a Ukrainian hint; regenerate once if the no-solutions filter fails.
 */
export async function generateExerciseHint(
  ctx: HintContext,
): Promise<{ hint: string; regenerated: boolean; usedFallback: boolean }> {
  const first = await generateText({
    model: HINT_MODEL,
    system: SYSTEM_PROMPT_UK,
    prompt: buildUserPrompt(ctx, false),
    maxOutputTokens: 300,
  });

  let text = (first.text ?? "").trim();
  let regenerated = false;
  let usedFallback = false;

  if (looksLikeSolutionCode(text)) {
    regenerated = true;
    const second = await generateText({
      model: HINT_MODEL,
      system: SYSTEM_PROMPT_UK,
      prompt: buildUserPrompt(ctx, true),
      maxOutputTokens: 250,
    });
    text = (second.text ?? "").trim();
    if (looksLikeSolutionCode(text) || !text) {
      usedFallback = true;
      text = SAFE_GENERIC_HINT_UK;
    }
  }

  if (!text) {
    usedFallback = true;
    text = SAFE_GENERIC_HINT_UK;
  }

  return { hint: text, regenerated, usedFallback };
}
