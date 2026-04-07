# Work Log

A personal work hours dashboard — updated daily via Claude, hosted on Vercel.

## How it works

1. **You** tell Claude your hours and what you worked on each day
2. **Claude** updates `data/logs.json` via GitHub API automatically
3. **Dashboard** on Vercel reflects the update within seconds

## Log format

Each entry in `data/logs.json`:

```json
{
  "date": "2025-04-07",
  "hours": 7.5,
  "tasks": "Short summary of what was done",
  "notes": "Longer optional details"
}
```

## Features

- Today / This Week / All Entries tabs
- Weekly hour totals
- PDF export (day, week, or all time)
- Auto-refreshes every 30 seconds

## Deployment

Push to GitHub → import on Vercel → auto-deploys.
