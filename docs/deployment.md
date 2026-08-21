# Deployment

The repo deploys to a single Cloudflare Worker via GitHub Actions on every push to `main`. The Worker hosts the built SPA from `dist/client` and the `/api/*` proxy endpoints in one bundle.

## Manual deploy

```bash
pnpm wrangler login
export CLOUDFLARE_ACCOUNT_ID=...          # see the dashboard URL
pnpm wrangler secret put WEATHER_API_KEY  # production secret
pnpm deploy
```

`wrangler.jsonc` carries no `account_id`, so the environment supplies it — the
same variable CI uses. Without it wrangler picks whichever account the login
happens to have; with it, a deploy aimed at the wrong account fails instead of
succeeding somewhere unexpected.

## CI

Set these GitHub repo secrets:

- `CLOUDFLARE_API_TOKEN` — scoped to "Edit Cloudflare Workers"
- `CLOUDFLARE_ACCOUNT_ID`

## Local API key

The repo ships with `.dev.vars.example`. Copy it and add a free key from [WeatherAPI.com](https://www.weatherapi.com/signup.aspx) to run locally without depending on the deployed proxy:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste your key
```

## Scripts

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Vite dev server with the Worker integrated           |
| `pnpm build`        | Type-check + production build                        |
| `pnpm preview`      | Preview the built bundle                             |
| `pnpm deploy`       | Build and deploy to Cloudflare Workers               |
| `pnpm typecheck`    | Type-check across all three project references       |
| `pnpm lint`         | ESLint (`typescript-eslint`, `react-hooks`)          |
| `pnpm lint:fix`     | ESLint with `--fix`                                  |
| `pnpm format`       | Prettier write                                       |
| `pnpm format:check` | Prettier check (CI gate; fails on unformatted files) |
| `pnpm test`         | Vitest watch mode (both projects)                    |
| `pnpm test:run`     | Vitest single run                                    |
| `pnpm ci`           | format:check + lint + typecheck + test:run + build   |
