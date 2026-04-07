# Oasis

A small, fast weather forecast app. Search any city, see today's conditions.

> Phase 1 scaffold. Real features land in subsequent phases.

## Quick Start

```bash
pnpm install
pnpm dev
```

The dev server runs Vite + the Cloudflare Worker together. The app is available at the URL Vite prints; `/api/weather` is handled by the Worker locally.

### Bring your own API key (optional)

The repo ships with a `.dev.vars.example`. Copy it and add a free key from [WeatherAPI.com](https://www.weatherapi.com/signup.aspx):

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste your key
```

## Scripts

| Command            | Purpose                               |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Vite dev server with Worker integration |
| `pnpm build`       | Type-check + production build         |
| `pnpm preview`     | Preview the built bundle              |
| `pnpm deploy`      | Build and deploy to Cloudflare        |
| `pnpm typecheck`   | Type-check only                       |
| `pnpm lint`        | Biome lint + format check             |
| `pnpm lint:fix`    | Biome auto-fix                        |
| `pnpm test`        | Vitest watch mode                     |
| `pnpm test:run`    | Vitest single run                     |
| `pnpm ci`          | Run the full CI pipeline locally      |

## Stack

- React 19, TypeScript, Vite
- Cloudflare Workers (single deploy hosts the SPA and the `/api/weather` proxy)
- TanStack Query *(coming in Phase 4)*
- Tailwind v4 + shadcn/ui *(coming in Phase 4)*
- Vitest + MSW *(coming in Phase 2)*
- Biome for lint and format

## License

MIT.
