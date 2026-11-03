# PyClass

Шкільний курс Python українською. Next.js + Postgres (Neon) + Drizzle.

## Локально

```bash
pnpm install
vercel env pull .env.local
pnpm db:migrate
pnpm db:seed
pnpm content:sync
pnpm dev
```

## Скрипти

- `pnpm db:migrate` — застосувати SQL-міграції (через Neon HTTP)
- `pnpm db:seed` — група DEMO10A + вчитель (контент через `pnpm content:sync`)
- `pnpm typecheck` / `pnpm build`
