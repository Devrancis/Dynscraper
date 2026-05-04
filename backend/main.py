from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core_scraper import run_stealth_scraper
from database import init_db, save_to_neon, get_latest_intel

app = FastAPI(title="Dynamic Web Scraper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This creates your Postgres table automatically when the server starts
@app.on_event("startup")
def on_startup():
    print("[*] Verifying PostgreSQL database connection...")
    init_db()

@app.get("/")
def read_root():
    return {"status": "Lightweight API is online and ready."}

@app.get("/api/scrape")
async def manual_scrape(url: str = "https://thehackernews.com/"):
    """Triggers the scraper and saves new data to the database."""
    data = await run_stealth_scraper(url)
    
    if not data:
        return {"status": "error", "message": "Scrape failed. Check terminal logs."}
    
    # Save to Postgres (and get the count of newly inserted rows)
    inserted_count = save_to_neon(data)
        
    return {
        "status": "success",
        "total_scraped": len(data["threat_intel"]),
        "new_threats_added_to_db": inserted_count,
        "data": data
    }

@app.get("/api/intel")
def fetch_database_intel():
    """Endpoint for your Next.js dashboard to fetch the saved data."""
    return get_latest_intel()