import asyncio
import csv
import os
import random
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth 

from user_agents import USER_AGENTS

os.makedirs("data", exist_ok=True)

# --- 1. THE DATA PROCESSOR (CSV Export) ---
def save_intel_csv(data, source_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"data/intel_{source_name}_{timestamp}.csv"
    
    if not data["threat_intel"]:
        print("[!] No data extracted. Aborting file creation.")
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
            
    print(f"[+] Payload compiled and saved to {filename}")

# --- 2. THE CORE ENGINE ---
async def run_stealth_scraper(url):
    print(f"[*] Initializing secure connection to: {url}")
    
    # Select a random identity for this session
    current_ua = random.choice(USER_AGENTS)
    print(f"[*] Masking identity as: {current_ua[:50]}...")
    
    async with Stealth().use_async(async_playwright()) as p:
        
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=current_ua, # Injecting the rotated UA here
            viewport={"width": 1920, "height": 1080}
        )
        
        page = await context.new_page()
        
        try:
            print("[*] Bypassing proxies and navigating...")
            await page.goto(url, wait_until="networkidle")
            
            print("[*] Executing DOM extraction on target...")
            intel_nodes = await page.locator("a.story-link").all()
            
            extracted_data = {
                "scan_target": url,
                "timestamp": datetime.now().isoformat(),
                "threat_intel": []
            }

            for node in intel_nodes:
                title_element = node.locator("h2.home-title")
                
                if await title_element.count() > 0:
                    title = await title_element.inner_text()
                    link = await node.get_attribute("href")
                    
                    extracted_data["threat_intel"].append({
                        "indicator": title.strip(),
                        "reference_url": link
                    })
            
            print(f"[+] Extracted {len(extracted_data['threat_intel'])} data points.")
            
            # CHANGED: Return the dictionary directly to main.py
            return extracted_data

        except Exception as e:
            print(f"[!] Transmission Intercepted: {e}")
            
            # CHANGED: Return None so main.py knows the scrape failed
            return None
        
        finally:
            print("[*] Wiping context and closing browser.")
            await browser.close()

if __name__ == "__main__":
    target_url = "https://thehackernews.com/" 
    asyncio.run(run_stealth_scraper(target_url))