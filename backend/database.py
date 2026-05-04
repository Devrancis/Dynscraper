import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS threat_intel (
            id SERIAL PRIMARY KEY,
            scan_target TEXT,
            scraped_at TIMESTAMP,
            indicator TEXT,
            reference_url TEXT UNIQUE
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

def save_to_neon(extracted_data):
    if not extracted_data or not extracted_data.get("threat_intel"):
        return 0

    conn = get_db_connection()
    cur = conn.cursor()
    
    inserted_count = 0
    scan_target = extracted_data["scan_target"]
    timestamp = extracted_data["timestamp"]

    for item in extracted_data["threat_intel"]:
        indicator = item["indicator"]
        reference_url = item["reference_url"]

        cur.execute("""
            INSERT INTO threat_intel (scan_target, scraped_at, indicator, reference_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (reference_url) DO NOTHING;
        """, (scan_target, timestamp, indicator, reference_url))
        
        if cur.rowcount > 0:
            inserted_count += 1

    conn.commit()
    cur.close()
    conn.close()
    
    return inserted_count

def get_latest_intel(limit=50):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM threat_intel ORDER BY scraped_at DESC LIMIT %s;", (limit,))
    results = cur.fetchall()
    cur.close()
    conn.close()
    return results