import requests
from bs4 import BeautifulSoup
import time

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
DELAY = 2.5
AI_KEYWORDS = ['ai', 'llm', 'gpt', 'ml', 'machine learning',
               'neural', 'diffusion', 'agent', 'chatbot',
               'vision', 'embedding', 'openai', 'claude', 'model']


def safe_scrape(url, timeout=15):
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        return BeautifulSoup(r.text, 'html.parser')
    except Exception as e:
        print(f"[WARN] fetch failed {url}: {e}")
        return None


def extract_card_data(card, source, base_url=""):
    name_el = card.select_one('h2,h3,h4,[class*="name"],[class*="title"]')
    url_el = card.select_one('a[href]')
    desc_el = card.select_one('p,[class*="desc"],[class*="summary"]')
    if not name_el:
        return None
    href = url_el.get('href', '') if url_el else ''
    if href.startswith('/'):
        href = base_url + href
    return {
        "name": name_el.get_text(strip=True),
        "url": href,
        "raw_desc": desc_el.get_text(strip=True)[:300] if desc_el else "",
        "source": source
    }


def scrape_toolify():
    soup = safe_scrape("https://www.toolify.ai/new-ai-tools")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:15]:
        d = extract_card_data(card, "toolify")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_futurepedia():
    soup = safe_scrape("https://www.futurepedia.io/ai-tools")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:15]:
        d = extract_card_data(card, "futurepedia", "https://www.futurepedia.io")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_taaft():
    soup = safe_scrape("https://theresanaiforthat.com/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"]')[:15]:
        d = extract_card_data(card, "taaft")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_futuretools():
    soup = safe_scrape("https://www.futuretools.io/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "futuretools")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_topaitools():
    soup = safe_scrape("https://topai.tools/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "topaitools")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_aixploria():
    soup = safe_scrape("https://www.aixploria.com/en/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "aixploria")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_allthingsai():
    soup = safe_scrape("https://allthingsai.com/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "allthingsai")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_insidr():
    soup = safe_scrape("https://insidr.ai/ai-tools/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "insidr")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_toolfk():
    soup = safe_scrape("https://toolfk.com/")
    if not soup:
        return []
    tools = []
    for card in soup.select('[class*="tool"],[class*="card"],article')[:12]:
        d = extract_card_data(card, "toolfk")
        if d:
            tools.append(d)
    time.sleep(DELAY)
    return tools


def scrape_trendshift():
    tools = []
    for url in ["https://trendshift.io/", "https://trendshift.io/weekly"]:
        soup = safe_scrape(url)
        if not soup:
            time.sleep(DELAY)
            continue
        for card in soup.select('[class*="repo"],[class*="card"],article')[:20]:
            name_el = card.select_one('h2,h3,[class*="name"],[class*="title"]')
            url_el = card.select_one('a[href]')
            desc_el = card.select_one('p,[class*="desc"]')
            star_el = card.select_one('[class*="star"],[class*="count"]')
            if not name_el:
                continue
            desc = desc_el.get_text(strip=True) if desc_el else ""
            name = name_el.get_text(strip=True)
            if not any(kw in desc.lower() or kw in name.lower() for kw in AI_KEYWORDS):
                continue
            href = url_el.get('href', '') if url_el else ''
            if href.startswith('/'):
                href = 'https://trendshift.io' + href
            stars = 0
            if star_el:
                try:
                    stars = int(''.join(filter(str.isdigit, star_el.get_text())))
                except Exception:
                    pass
            tools.append({
                "name": name,
                "url": href,
                "raw_desc": desc[:300],
                "source": "trendshift",
                "votes": stars
            })
        time.sleep(DELAY)
    return tools


def scrape_all():
    all_tools = []
    scrapers = [
        ("toolify", scrape_toolify),
        ("futurepedia", scrape_futurepedia),
        ("taaft", scrape_taaft),
        ("futuretools", scrape_futuretools),
        ("topaitools", scrape_topaitools),
        ("aixploria", scrape_aixploria),
        ("allthingsai", scrape_allthingsai),
        ("insidr", scrape_insidr),
        ("toolfk", scrape_toolfk),
        ("trendshift", scrape_trendshift),
    ]
    for name, fn in scrapers:
        print(f"🔍 Scraping {name}...")
        try:
            results = fn()
            all_tools.extend(results)
            print(f"   → {len(results)} items")
        except Exception as e:
            print(f"   ⚠️ {name} failed: {e}")
    print(f"✅ Total scraped: {len(all_tools)}")
    return all_tools


if __name__ == "__main__":
    scrape_all()
