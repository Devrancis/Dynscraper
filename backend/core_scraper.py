import asyncio
import csv
import os
import random
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from user_agents import USER_AGENTS

os.makedirs("data", exist_ok=True)

def save_intel_csv(data, source_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"data/intel_{source_name}_{timestamp}.csv"
    
    if not data or not data.get("threat_intel"):
        return

    headers = ["scan_target", "timestamp", "indicator", "reference_url"]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        
        for item in data["threat_intel"]:
            writer.writerow({
                "scan_target": data["scan_target"],
                "timestamp": data["timestamp"],
                "indicator": item["indicator"],
                "reference_url": item["reference_url"]
            })
            
    print(f"[+] CSV Backup compiled and saved to {filename}")

async def run_stealth_scraper(url: str):
    print(f"[*] Initializing lightweight connection to: {url}")
    
    current_ua = random.choice(USER_AGENTS)
    print(f"[*] Masking identity as: {current_ua[:50]}...")
    
    headers = {
        "User-Agent": current_ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://google.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    }
    
    try:
        response = await asyncio.to_thread(requests.get, url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        extracted_data = {
            "scan_target": url,
            "timestamp": datetime.now().isoformat(),
            "threat_intel": []
        }

        # Find ALL links on the dynamic page
        intel_nodes = soup.find_all('a')
        
        for node in intel_nodes:
            # First, check if it's the HackerNews specific structure
            title_element = node.find('h2', class_='home-title')
            
            # GENERIC FALLBACK: If not HackerNews, look for any heading inside a link
            if not title_element:
                title_element = node.find(['h1', 'h2', 'h3'])
            
            if title_element and node.get('href'):
                title_text = title_element.text.strip()
                link = node.get('href')
                
                # Fix relative URLs (e.g., /article/123 -> https://site.com/article/123)
                if link.startswith('/'):
                    from urllib.parse import urlparse
                    parsed_uri = urlparse(url)
                    base_url = f"{parsed_uri.scheme}://{parsed_uri.netloc}"
                    link = base_url + link
                
                # Only save it if the title is actually descriptive (avoids nav links)
                if len(title_text) > 15:
                    extracted_data["threat_intel"].append({
                        "indicator": title_text,
                        "reference_url": link
                    })
        
        print(f"[+] Extracted {len(extracted_data['threat_intel'])} data points.")
        save_intel_csv(extracted_data, url.split('//')[-1].split('/')[0]) # Dynamic filename
        
        return extracted_data

    except Exception as e:
        print(f"[!] Transmission Intercepted: {e}")
        return None