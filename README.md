# threat-intel-dashboard

Pulls threat advisories from public sources, extracts intelligence, stores it in Postgres, and surfaces everything through a REST API and a React dashboard. Saves you from manually checking threat feeds every morning.

## What it does

- Scrapes live threat advisory pages using Playwright with stealth config (most of these sites block naive scrapers).
- Parses and extracts threat indicators (headlines) and reference URLs directly from unstructured HTML.
- Stores results in a Neon serverless Postgres DB and exposes them via FastAPI.
- Runs on a schedule via APScheduler — set it and forget it.
- Frontend is a Next.js dashboard for filtering and browsing advisories.

## Structure
/
├── backend/     # FastAPI + Playwright scraper + scheduler
└── frontend/    # Next.js 14 dashboard

## Stack

| Layer | Tech |
|---|---|
| Scraping | Python, Playwright (async), playwright-stealth |
| API | FastAPI, Uvicorn |
| Database | Neon (serverless Postgres), psycopg2 |
| Frontend | Next.js 14, Tailwind CSS, TypeScript |

## Getting started
```bash
git clone https://github.com/Devrancis/scraper.git
cd scraper
```

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # add your Neon DB connection string
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local  # add your API base URL
npm run dev
```

## Known limitations & gotchas

Stealth isn't magic. playwright-stealth handles most bot detection, but a few sites (Cloudflare Enterprise, PerimeterX) will still block you. If scraping a specific feed stops working, that's the first place to look. Rotating user agents helps.

Extraction relies on specific DOM structures. It works beautifully for our current targets, but if a source website updates its CSS classes or HTML layout, the Playwright locators will need adjusting. Deep regex-based IoC extraction (IPs/hashes) is planned for a future release.

Neon cold starts. The free tier spins down after inactivity. The first request after idle can take 2–3 seconds. Not a problem in prod with regular scrape intervals, but noticeable during development.

APScheduler runs in-process. Works fine for a single instance but will duplicate jobs if you ever scale to multiple workers. If that becomes relevant, swap it out for a proper task queue (Celery, ARQ, etc.).


## Contributing
Open an issue before sending a PR — especially for new scraping targets, since some sources need custom parsing logic.