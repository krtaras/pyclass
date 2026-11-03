# -*- coding: utf-8 -*-
"""Generate content/modules/*.json and tests/fixtures/solutions.json for modules 1-4."""
from __future__ import annotations
from pathlib import Path
import json
import textwrap

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "modules"
OUT.mkdir(parents=True, exist_ok=True)
SOL_PATH = ROOT / "tests" / "fixtures" / "solutions.json"
SOL_PATH.parent.mkdir(parents=True, exist_ok=True)

solutions: dict = {}

def L(slug, order, title, body, video, exercises, quizzes):
    return {
        "slug": slug,
        "order": order,
        "title": title,
        "bodyMarkdown": textwrap.dedent(body).strip() + "\n",
        "videoUrl": video,
        "exercises": exercises,
        "quizzes": quizzes,
    }

def E(slug, prompt, starter, tests, correct, wrong, hint=3):
    solutions[slug] = {"correct": correct, "wrong": wrong}
    return {
        "slug": slug,
        "prompt": prompt,
        "starterCode": starter,
        "hintLimit": hint,
        "tests": tests,
    }

def IO(inp, out, visible=False):
    return {"type": "io", "input": inp, "output": out, "visible": visible}

def Q(slug, kind, prompt, options, correct, explanation, code=None):
    q = {
        "slug": slug,
        "kind": kind,
        "prompt": prompt,
        "options": options,
        "correct": correct,
        "explanation": explanation,
    }
    if code is not None:
        q["code"] = code
    return q

V_UA = "https://www.youtube.com/watch?v=XBbIkZK388U"
V_MOSH = "https://www.youtube.com/watch?v=kqtD5dpn9C8"
V_NUM = "https://www.youtube.com/watch?v=khKv-8q7YmY"
V_STR = "https://www.youtube.com/watch?v=k9TUPpGqYTo"
V_COND = "https://www.youtube.com/watch?v=DZwmZ8Usvnk"
V_IF = "https://www.youtube.com/watch?v=AWek49wXGzI"
V_LOOP = "https://www.youtube.com/watch?v=6iF8Xb7Z3wQ"
V_FOR = "https://www.youtube.com/watch?v=KWgYha0clzw"

def dump_module(filename, slug, order, title, lessons):
    data = {"slug": slug, "order": order, "title": title, "lessons": lessons}
    (OUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(filename, "lessons", len(lessons), "ex", sum(len(x["exercises"]) for x in lessons), "quiz", sum(len(x["quizzes"]) for x in lessons))

# ========== M01 ==========
m01 = []
m01.append(L("m01-l01-what-is-python", 1, "Що таке Python і навіщо він потрібен", """
## Привіт!

Python — мова програмування. Нею пишуть сайти, ігри, автоматизацію.
Для нас важливо: **синтаксис простий**, майже як звичайні речення.

## Перша програма

```python
print("Привіт, Новояворівськ!")
```

```python
print(2 + 2)
print("2 + 2")
```

## Типові помилки

- Забути лапки: `print(Привіт)`.
- Написати `Print` з великої літери.
- Забути дужки.
""", V_UA, [
  E("m01-l01-e1-hello", 'Виведи на екран рядок: Привіт, Python!', '# допиши один рядок з print\n',
    [IO("", "Привіт, Python!", True)], 'print("Привіт, Python!")\n', 'print("Привіт")\n'),
  E("m01-l01-e2-two-lines", 'Виведи два рядки: спочатку «Добрий день», потім «ДНЗ Новояворівське ВПУ».',
    'print("Добрий день")\n# допиши другий print\n',
    [IO("", "Добрий день\nДНЗ Новояворівське ВПУ", True)],
    'print("Добрий день")\nprint("ДНЗ Новояворівське ВПУ")\n', 'print("Добрий день")\nprint("ВПУ")\n'),
], [
  Q("m01-l01-q1", "single", "Що робить команда print?",
    ["Виводить текст або значення на екран", "Зберігає файл", "Видаляє змінну", "Запускає інтернет"],
    "Виводить текст або значення на екран", "print показує результат у консолі."),
  Q("m01-l01-q2", "output", "Що виведе цей код?", ["4", "2 + 2", "22", "Помилка"], "4",
    "Без лапок Python обчислює вираз.", "print(2 + 2)"),
  Q("m01-l01-q3", "multi", "Які з цих записів коректні в Python 3?",
    ['print("Привіт")', "Print('Привіт')", "print('ОК')", "print Привіт"],
    ['print("Привіт")', "print('ОК')"], "Потрібні маленькі літери print, дужки й лапки."),
]))

m01.append(L("m01-l02-print", 2, "print: вивід тексту й чисел", """
## Кілька аргументів

```python
print("Сума:", 10 + 5)
```

## Параметр end

```python
print("Раз", end=" ")
print("Два")
```

## Типові помилки

- Змішати типи лапок у одному рядку.
""", V_MOSH, [
  E("m01-l02-e1-sum-label", 'Виведи рівно: Сума: 15\nПідказка: print з текстом і виразом 10+5.',
    '# print("Сума:", ...)\n', [IO("", "Сума: 15", True)],
    'print("Сума:", 10 + 5)\n', 'print("Сума: 10+5")\n'),
  E("m01-l02-e2-three-numbers", 'Виведи числа 1, 2 і 3 — кожне з нового рядка.',
    'print(1)\n# допиши ще два print\n', [IO("", "1\n2\n3", True)],
    'print(1)\nprint(2)\nprint(3)\n', 'print(1, 2, 3)\n'),
], [
  Q("m01-l02-q1", "output", "Що виведе код?", ["Сума: 15", "Сума:10+5", "Сума: 10 + 5", "Помилка"],
    "Сума: 15", "Аргументи розділяються пробілом.", 'print("Сума:", 10 + 5)'),
  Q("m01-l02-q2", "single", "Чому потрібні лапки в print(\"Привіт\")?",
    ["Щоб Python зрозумів, що це текст, а не ім'я змінної", "Щоб програма працювала швидше", "Лапки не потрібні", "Щоб створити файл"],
    "Щоб Python зрозумів, що це текст, а не ім'я змінної", "Без лапок шукається змінна."),
  Q("m01-l02-q3", "single", "Скільки рядків дадуть три окремі print?",
    ["3", "1", "0", "2"], "3", "Кожен print — новий рядок."),
]))

m01.append(L("m01-l03-comments", 3, "Коментарі: нотатки для себе", """
## Коментар

```python
# Це коментар
print("Працює")  # теж коментар
```

Python ігнорує текст після `#`.

## Типові помилки

- Писати пояснення без `#`.
""", None, [
  E("m01-l03-e1-with-comment", 'Залиш коментар у першому рядку (# ...) і виведи слово Готово.',
    '# напиши коментар\n', [IO("", "Готово", True)],
    '# пояснення\nprint("Готово")\n', 'print("Старт")\n'),
  E("m01-l03-e2-only-print", 'Закоментуй рядок з «Секрет», щоб лишилось лише «Відкрито».',
    'print("Відкрито")\nprint("Секрет")\n', [IO("", "Відкрито", True)],
    'print("Відкрито")\n# print("Секрет")\n', 'print("Відкрито")\nprint("Секрет")\n'),
], [
  Q("m01-l03-q1", "single", "Що робить рядок, який починається з #?",
    ["Його ігнорує Python — це коментар", "Виводить текст", "Створює змінну", "Зупиняє програму"],
    "Його ігнорує Python — це коментар", "Коментарі для людей."),
  Q("m01-l03-q2", "output", "Що виведе програма?", ["Привіт", "вітання", "Привіт\nвітання", "Нічого"],
    "Привіт", "Рядок із # не виконується.", '# вітання\nprint("Привіт")'),
  Q("m01-l03-q3", "multi", "Де доречно ставити коментарі?",
    ["Пояснити складний рядок", "Написати план перед кодом", "Замість усього коду", "Позначити одиниці виміру"],
    ["Пояснити складний рядок", "Написати план перед кодом", "Позначити одиниці виміру"],
    "Коментарі пояснюють, а не замінюють код."),
]))

m01.append(L("m01-l04-errors", 4, "Помилки: як їх читати", """
## SyntaxError і NameError

```python
print("Привіт"  # SyntaxError — немає )
print(imya)     # NameError — немає змінної
```

Читайте тип помилки й номер рядка.

## Типові помилки

- Виправити не той рядок.
""", V_MOSH, [
  E("m01-l04-e1-fix-quotes", 'Виправ лапки так, щоб вивелося: OK',
    'print("OK)\n', [IO("", "OK", True)], 'print("OK")\n', 'print("Ні")\n'),
  E("m01-l04-e2-two-prints", 'Виведи «Раз» і «Два» з нового рядка.',
    'print("Раз")\n', [IO("", "Раз\nДва", True)],
    'print("Раз")\nprint("Два")\n', 'print("Раз")\nprint("Три")\n'),
], [
  Q("m01-l04-q1", "single", "Яка помилка при print(\"Привіт\" без ) ?",
    ["SyntaxError", "NameError", "TypeError", "Помилок не буде"], "SyntaxError", "Дужки мають бути парними."),
  Q("m01-l04-q2", "single", "Що означає NameError?",
    ["Використали ім'я, якого Python не знає", "Немає інтернету", "Файл завеликий", "Занадто багато print"],
    "Використали ім'я, якого Python не знає", "Часто опечатка в назві."),
  Q("m01-l04-q3", "output", "Що виведе код?", ["7", "3 + 4", "34", "Помилка"], "7",
    "Арифметика без лапок.", "print(3 + 4)"),
]))

m01.append(L("m01-l05-first-program", 5, "Міні-програма: вітання", """
## Збираємо разом

```python
# Вітання для групи
print("Ласкаво просимо до курсу Python!")
print("ДНЗ «Новояворівське ВПУ»")
```

Порядок — зверху вниз.

## Типові помилки

- Зайвий відступ на початку рядка.
""", V_UA, [
  E("m01-l05-e1-welcome",
    'Виведи два рядки:\nЛаскаво просимо до курсу Python!\nДНЗ «Новояворівське ВПУ»',
    '# вітання\n',
    [IO("", "Ласкаво просимо до курсу Python!\nДНЗ «Новояворівське ВПУ»", True)],
    'print("Ласкаво просимо до курсу Python!")\nprint("ДНЗ «Новояворівське ВПУ»")\n',
    'print("Привіт")\nprint("ВПУ")\n'),
  E("m01-l05-e2-schedule", 'Виведи:\n1. Теорія\n2. Практика\n3. Перерва',
    'print("1. Теорія")\n',
    [IO("", "1. Теорія\n2. Практика\n3. Перерва", True)],
    'print("1. Теорія")\nprint("2. Практика")\nprint("3. Перерва")\n',
    'print("1. Теорія")\nprint("2. Практика")\n'),
  E("m01-l05-e3-shop", 'Виведи:\nТовар: зошит\nЦіна: 25', '# цінник\n',
    [IO("", "Товар: зошит\nЦіна: 25", True)],
    'print("Товар: зошит")\nprint("Ціна: 25")\n',
    'print("Товар: ручка")\nprint("Ціна: 25")\n'),
], [
  Q("m01-l05-q1", "single", "У якому порядку виконуються команди?",
    ["Зверху вниз", "Спочатку всі print", "Випадково", "Знизу вгору"], "Зверху вниз", "Базовий порядок скрипта."),
  Q("m01-l05-q2", "output", "Що виведе код?", ["A\nB", "AB", "B\nA", "Помилка"], "A\nB",
    "Два print — два рядки.", 'print("A")\nprint("B")'),
  Q("m01-l05-q3", "multi", "Що варто зробити перед здачею?",
    ["Запустити й перевірити вивід", "Прочитати повідомлення помилки", "Видалити всі print", "Перевірити лапки й дужки"],
    ["Запустити й перевірити вивід", "Прочитати повідомлення помилки", "Перевірити лапки й дужки"],
    "Перевірка запуском ловить дрібні помилки."),
]))

dump_module("m01-intro.json", "m01-intro", 1, "Знайомство з Python", m01)

# Continue m02-m04 in same file - import from second half via run
print("m01 solutions", len(solutions))
Path("/tmp/sol.json").write_text(json.dumps(solutions, ensure_ascii=False), encoding="utf-8")
# Persist generator state by writing rest as another call
Path("/tmp/gen_part1_done").write_text("1")
