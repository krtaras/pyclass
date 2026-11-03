export type GroupCsvRow = {
  name: string;
  email: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  exerciseSolved: number;
  exerciseTotal: number;
  quizCorrect: number;
  quizTotal: number;
  grade: number;
  lastActivity: string; // ISO or empty
};

const HEADERS = [
  "Імʼя",
  "Email",
  "Уроків завершено",
  "Уроків усього",
  "Вправи (розвʼязано)",
  "Вправи (усього)",
  "Квіз (правильно)",
  "Квіз (усього)",
  "Оцінка",
  "Остання активність",
] as const;

/** Escape one CSV cell (RFC-style quotes). */
export function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a UTF-8 CSV with BOM so Excel opens Cyrillic correctly.
 * Columns match the teacher group table.
 */
export function buildGroupCsv(rows: GroupCsvRow[]): string {
  const lines: string[] = [];
  lines.push(HEADERS.map(escapeCsvCell).join(","));
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.email,
        row.lessonsCompleted,
        row.lessonsTotal,
        row.exerciseSolved,
        row.exerciseTotal,
        row.quizCorrect,
        row.quizTotal,
        row.grade,
        row.lastActivity,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
