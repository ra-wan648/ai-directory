import feedparser
import time

RSS_FEEDS = [
    {"url": "https://www.producthunt.com/feed?category=artificial-intelligence",
     "type": "tools", "source": "producthunt"},
    {"url": "https://tldr.tech/ai/rss", "type": "news", "source": "tldr_ai"},
    {"url": "https://www.bensbites.com/rss", "type": "news", "source": "bensbites"},
    {"url": "https://feeds.feedburner.com/venturebeat/SZYF",
     "type": "news", "source": "venturebeat"},
    {"url": "https://openai.com/news/rss", "type": "news", "source": "openai"},
    {"url": "https://anthropic.com/news/rss", "type": "news", "source": "anthropic"},
    {"url": "https://aiwire.net/feed/", "type": "news", "source": "aiwire"},
    {"url": "https://marktechpost.com/feed/", "type": "news", "source": "marktechpost"},
    {"url": "https://therundown.ai/rss", "type": "news", "source": "therundown"},
]


def fetch_rss(feed):
    try:
        f = feedparser.parse(feed["url"])
        items = []
        for entry in f.entries[:5]:
            items.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "summary": entry.get("summary", "")[:500],
                "type": feed["type"],
                "source": feed["source"]
            })
        time.sleep(1)
        return items
    except Exception as e:
        print(f"[WARN] RSS {feed['source']} failed: {e}")
        return []


def fetch_all_rss():
    all_items = []
    for feed in RSS_FEEDS:
        print(f"📡 RSS: {feed['source']}...")
        all_items.extend(fetch_rss(feed))
    print(f"✅ Total RSS: {len(all_items)}")
    return all_items


if __name__ == "__main__":
    fetch_all_rss()
