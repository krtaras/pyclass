import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  modules,
  lessons,
  exercises,
  quizQuestions,
  groups,
} from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = neon(url);
  const db = drizzle(sql);

  await db.delete(quizQuestions);
  await db.delete(exercises);
  await db.delete(lessons);
  await db.delete(modules);
  await db.delete(groups);

  const [demoGroup] = await db
    .insert(groups)
    .values({ name: "Демо-група 10-А", inviteCode: "DEMO10A" })
    .returning();

  const [mod] = await db
    .insert(modules)
    .values({ title: "Основи Python", order: 1 })
    .returning();

  const [lesson1] = await db
    .insert(lessons)
    .values({
      moduleId: mod.id,
      order: 1,
      title: "print і змінні",
      bodyMarkdown: `## Привіт, Python!

У цьому уроці ти навчишся виводити текст і зберігати дані в **змінних**.

### Функція \`print\`
\`\`\`python
print("Привіт, світе!")
\`\`\`

### Змінні
Змінна — це ім'я для значення:
\`\`\`python
name = "Оля"
age = 14
print(name)
print(age)
\`\`\`

Спробуй змінити значення і подивись, що виведе програма.
`,
      videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      videoKind: "youtube",
    })
    .returning();

  const [lesson2] = await db
    .insert(lessons)
    .values({
      moduleId: mod.id,
      order: 2,
      title: "if/else",
      bodyMarkdown: `## Умови: if / else

Інколи програма має вибрати, що робити. Для цього є \`if\` і \`else\`.

\`\`\`python
age = 15
if age >= 18:
    print("Дорослий")
else:
    print("Неповнолітній")
\`\`\`

### Порівняння
- \`==\` — дорівнює
- \`!=\` — не дорівнює
- \`>\`, \`<\`, \`>=\`, \`<=\`

Напиши умову самостійно у вправі нижче.
`,
      videoUrl: "https://www.youtube.com/watch?v=AWek49wXGzI",
      videoKind: "youtube",
    })
    .returning();

  await db.insert(exercises).values([
    {
      lessonId: lesson1.id,
      prompt:
        "Створи змінну greeting зі значенням \"Привіт\" і виведи її через print.",
      starterCode: 'greeting = ""\n# допиши код нижче\n',
      tests: [
        { type: "assert", code: "assert greeting == 'Привіт'" },
        { type: "io", input: "", output: "Привіт" },
      ],
      hintLimit: 3,
    },
    {
      lessonId: lesson2.id,
      prompt:
        "Маєш змінну score. Якщо score >= 50, виведи \"Здав\", інакше — \"Не здав\".",
      starterCode: "score = 72\n# допиши if/else\n",
      tests: [
        {
          type: "assert",
          code: "score = 72\nassert score >= 50",
        },
        { type: "io", input: "", output: "Здав" },
      ],
      hintLimit: 3,
    },
  ]);

  await db.insert(quizQuestions).values([
    {
      lessonId: lesson1.id,
      kind: "single",
      prompt: "Що робить функція print?",
      options: [
        "Зчитує текст із клавіатури",
        "Виводить текст на екран",
        "Видаляє змінну",
        "Запускає програму",
      ],
      correct: "Виводить текст на екран",
      explanation: "print показує значення в консолі.",
    },
    {
      lessonId: lesson1.id,
      kind: "output",
      prompt: "Що виведе цей код?",
      code: "x = 2\ny = 3\nprint(x + y)",
      options: ["23", "5", "x + y", "Помилка"],
      correct: "5",
      explanation: "Спочатку обчислюється 2 + 3, потім виводиться 5.",
    },
    {
      lessonId: lesson2.id,
      kind: "single",
      prompt: "Який оператор перевіряє рівність?",
      options: ["=", "==", "!=", ":="],
      correct: "==",
      explanation: "Один знак = — це присвоєння, два == — порівняння.",
    },
    {
      lessonId: lesson2.id,
      kind: "multi",
      prompt: "Які з цих порівнянь правильні для числа 10?",
      options: ["10 > 5", "10 == 10", "10 < 3", "10 != 7"],
      correct: ["10 > 5", "10 == 10", "10 != 7"],
      explanation: "10 не менше за 3, решта тверджень істинні.",
    },
  ]);

  console.log("Seed OK", {
    groupId: demoGroup.id,
    moduleId: mod.id,
    lessons: [lesson1.id, lesson2.id],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
