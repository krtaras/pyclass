import type { ContentModule } from "./types";
import { module01 } from "./modules/m01-intro";
import { module02 } from "./modules/m02-variables";
import { module03 } from "./modules/m03-conditions";
import { module04 } from "./modules/m04-loops";
import { module05 } from "./modules/m05-strings";
import { module06 } from "./modules/m06-lists";
import { module07 } from "./modules/m07-functions";
import { module08 } from "./modules/m08-dicts";
import { module09 } from "./modules/m09-errors";
import { module10 } from "./modules/m10-project";

/** Full course outline. */
export const COURSE_OUTLINE = [
  { order: 1, slug: "m01-intro", title: "Знайомство з Python" },
  { order: 2, slug: "m02-variables", title: "Змінні та типи" },
  { order: 3, slug: "m03-conditions", title: "Умови" },
  { order: 4, slug: "m04-loops", title: "Цикли" },
  { order: 5, slug: "m05-strings", title: "Рядки" },
  { order: 6, slug: "m06-lists", title: "Списки та кортежі" },
  { order: 7, slug: "m07-functions", title: "Функції" },
  { order: 8, slug: "m08-dicts", title: "Словники та множини" },
  { order: 9, slug: "m09-errors", title: "Помилки та try/except" },
  { order: 10, slug: "m10-project", title: "Підсумковий проєкт" },
] as const;

/** Modules shipped. */
export const COURSE_MODULES: ContentModule[] = [
  module01,
  module02,
  module03,
  module04,
  module05,
  module06,
  module07,
  module08,
  module09,
  module10,
];
