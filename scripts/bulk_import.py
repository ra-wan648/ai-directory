import json
import os
import time
import requests
from bs4 import BeautifulSoup
from llm import parse_tool_from_raw
from db import tool_exists, bulk_insert

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
PROGRESS_FILE = "bulk_progress.json"


def load_progress():
    try:
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def save_progress(p):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(p, f)


def scrape_page(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        tools = []
        for card in soup.select('[class*="tool"],[class*="card"],article')[:30]:
            name_el = card.select_one('h2,h3,h4,[class*="name"],[class*="title"]')
            url_el = card.select_one('a[href]')
            desc_el = card.select_one('p,[class*="desc"]')
            if not name_el:
                continue
            href = url_el.get('href', '') if url_el else ''
            tools.append({
                "name": name_el.get_text(strip=True),
                "url": href,
                "raw_desc": desc_el.get_text(strip=True)[:300] if desc_el else "",
                "source": "bulk"
            })
        return tools
    except Exception as e:
        print(f"[WARN] {url}: {e}")
        return []


BULK_SOURCES = [
    {"name": "toolify", "base": "https://www.toolify.ai/new-ai-tools", "param": "?page={}", "max": 100},
    {"name": "futurepedia", "base": "https://www.futurepedia.io/ai-tools", "param": "?page={}", "max": 50},
    {"name": "topaitools", "base": "https://topai.tools", "param": "?page={}", "max": 50},
    {"name": "allthingsai", "base": "https://allthingsai.com", "param": "?page={}", "max": 30},
    {"name": "trendshift_yearly", "base": "https://trendshift.io/yearly", "param": "", "max": 1},
    {"name": "trendshift_monthly", "base": "https://trendshift.io/monthly", "param": "", "max": 1},
]


def run_bulk():
    progress = load_progress()
    all_raw = []

    for source in BULK_SOURCES:
        name = source['name']
        done_pages = progress.get(name, [])
        print(f"\n{'=' * 40}")
        print(f"📦 Source: {name}")

        for page in range(1, source['max'] + 1):
            if page in done_pages:
                continue
            param = source['param'].format(page) if source['param'] else ''
            url = source['base'] + param
            print(f"  Page {page}/{source['max']}: {url}")
            tools = scrape_page(url)
            if not tools:
                print(f"  → Empty. Stopping {name}.")
                break
            all_raw.extend(tools)
            print(f"  → {len(tools)} raw items")
            done_pages.append(page)
            progress[name] = done_pages
            save_progress(progress)
            time.sleep(3)

    print(f"\n✅ Total raw: {len(all_raw)}")
    print("🤖 Processing with LLM (batch)...")

    batch = []
    inserted = 0
    skipped = 0
    errors = 0

    for i, raw in enumerate(all_raw):
        print(f"[{i + 1}/{len(all_raw)}] {raw.get('name', '?')}")
        try:
            if tool_exists(
                raw.get('name', '').lower().replace(' ', '-'),
                raw.get('url', '')
            ):
                print("  → SKIP (duplicate)")
                skipped += 1
                continue
            tool = parse_tool_from_raw(raw)
            if not tool:
                skipped += 1
                continue
            batch.append(tool)
            if len(batch) >= 10:
                result = bulk_insert(batch)
                if result:
                    inserted += result.get('inserted', 0)
                batch = []
            time.sleep(1)
        except Exception as e:
            errors += 1
            print(f"  → ERROR: {e}")

    if batch:
        result = bulk_insert(batch)
        if result:
            inserted += result.get('inserted', 0)

    print(f"\n🎉 BULK IMPORT DONE!")
    print(f"   Inserted: {inserted}")
    print(f"   Skipped:  {skipped}")
    print(f"   Errors:   {errors}")


if __name__ == "__main__":
    run_bulk()
