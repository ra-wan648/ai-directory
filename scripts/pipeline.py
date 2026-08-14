import sys
from scrapers import scrape_all
from rss import fetch_all_rss
from llm import (parse_tool_from_raw, generate_blog_from_news,
                 llm_find_new_tools, generate_prompt_ideas)
from db import tool_exists, save_tool, save_blog, save_prompt
from telegram import (send_blog_notification, send_prompt_notification,
                      send_error, send_summary)

tools_added = 0
blogs_generated = 0
prompts_generated = 0
errors = 0


def process_tools():
    global tools_added, errors
    raw_all = scrape_all()
    try:
        llm_tools = llm_find_new_tools()
        raw_all.extend([{
            "name": t.get("name", ""),
            "url": t.get("url", ""),
            "raw_desc": t.get("description", ""),
            "source": "llm_search",
            "_structured": t
        } for t in llm_tools])
    except Exception as e:
        print(f"[WARN] LLM find tools failed: {e}")

    for raw in raw_all:
        try:
            if raw.get('_structured'):
                tool = raw['_structured']
            else:
                tool = parse_tool_from_raw(raw)
            if not tool:
                continue
            result = save_tool(tool)
            if result and result.get('status') == 'inserted':
                tools_added += 1
                print(f"[NEW] {tool.get('name')}")
            elif result and result.get('status') == 'updated':
                print(f"[UPD] {tool.get('name')}")
            else:
                print(f"[SKP] {tool.get('name', 'unknown')}")
        except Exception as e:
            errors += 1
            print(f"[ERR] tool: {e}")


def process_blogs():
    global blogs_generated, errors
    rss_items = fetch_all_rss()
    count = 0
    for item in rss_items:
        if count >= 3:
            break
        try:
            blog = generate_blog_from_news(item)
            if not blog:
                continue
            blog_id = save_blog(blog)
            if blog_id:
                send_blog_notification(blog, blog_id)
                blogs_generated += 1
                count += 1
                print(f"[BLOG] {blog.get('title')}")
        except Exception as e:
            errors += 1
            print(f"[ERR] blog: {e}")


def process_prompts():
    global prompts_generated, errors
    try:
        prompts = generate_prompt_ideas()
        for p in prompts:
            pid = save_prompt(p)
            if pid:
                send_prompt_notification(p, pid)
                prompts_generated += 1
                print(f"[PROMPT] {p.get('title')}")
    except Exception as e:
        errors += 1
        print(f"[ERR] prompts: {e}")


if __name__ == "__main__":
    print("🚀 Pipeline starting...")
    try:
        process_tools()
    except Exception as e:
        send_error(f"Tools crashed: {e}")
        errors += 1
    try:
        process_blogs()
    except Exception as e:
        send_error(f"Blogs crashed: {e}")
        errors += 1
    try:
        process_prompts()
    except Exception as e:
        send_error(f"Prompts crashed: {e}")
        errors += 1
    send_summary(tools_added, blogs_generated, prompts_generated, errors)
    print(f"✅ Done! Tools:{tools_added} Blogs:{blogs_generated} Prompts:{prompts_generated} Errors:{errors}")
