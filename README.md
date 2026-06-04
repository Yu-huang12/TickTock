# Tick Tock Challenge ⏱️

Test your internal stopwatch. You get a hidden target time — start the clock, count in your head, and stop as close to the target as you can. The closer you land, the higher your tier and score.

Built with **Vite + React + TypeScript + Tailwind CSS v4** and a **Supabase** realtime backend.

## Game modes

- **Solo** — chase targets, build streaks, and track your accuracy history.
- **Online** — real-time rooms where friends play from their own phones. Join by 4-character **code** or by **scanning a QR**.
- **Pass & Play** — local hot-seat multiplayer on a single device (works offline).

Press **Space** to start/stop the timer in any mode.

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.

## Enabling Online multiplayer

Online play needs a free [Supabase](https://supabase.com) project. Solo and Pass & Play work without it.

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Under **Authentication → Providers**, enable **Anonymous** sign-ins.
4. Copy the env template and add your keys:
   ```bash
   cp .env.example .env
   ```
   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from **Project Settings → API**).
5. Restart the dev server.

> The `anon` key is a public client key and is safe to ship in a frontend app. Never commit your `.env` — it is git-ignored.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

## Project structure

```
src/
  components/      UI + QR invite/scanner components
  lib/             Supabase client, realtime room context, game logic
  pages/           Solo, Online, Room, Pass & Play, How to Play
supabase/
  schema.sql       Tables, row-level security, and realtime setup
```
