import requests
from bs4 import BeautifulSoup
from datetime import datetime
import asyncio

async def run_stealth_scraper(target_url: str):
    print(f"\n[*] Lightweight scrape initiated on {target_url}...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        # Run synchronous requests inside an async thread so it doesn't block FastAPI
        response = await asyncio.to_thread(requests.get, target_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        intel_data = []
        
        articles = soup.find_all('div', class_='body-post')
        
        for article in articles[:15]: 
            title_elem = article.find('h2', class_='home-title')
            link_elem = article.find('a', class_='story-link')
            
            if title_elem and link_elem:
                intel_data.append({
                    "scan_target": target_url,
                    "indicator": title_elem.text.strip(),
                    "reference_url": link_elem['href'],
                    "scraped_at": datetime.utcnow().isoformat()
                })
                
        print(f"[+] Successfully extracted {len(intel_data)} indicators using bs4.")
        return intel_data
        
    except Exception as e:
        print(f"[!] Scraper failed: {str(e)}")
        return []