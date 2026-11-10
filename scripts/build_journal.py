#!/usr/bin/env python3
"""Generate safe static journal pages from content/journal/*.md.

Only basic paragraphs, headings, and lists are supported. HTML is escaped.
"""
from pathlib import Path
from html import escape
from datetime import datetime
import re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "journal"
OUTPUT = ROOT / "blog"
START = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><link rel=\"stylesheet\" href=\"../styles.css?v=20261110-brand5\">"
HEADER = '<div class="announcement">WELCOME TO THE OFFICIAL SKUNKLA WEBSITE</div><header class="site-header"><a class="brand" href="../index.html"><img class="brand-image" src="../assets/skunk-logo-black.svg" alt="SKUNKLA"></a><nav aria-label="Main navigation"><a href="../index.html">Home</a><a href="../about.html">About</a><a href="./index.html">Journal</a><a href="../contact.html">Contact</a></nav></header>'
FOOTER = '<footer><div class="footer-bottom"><small>© 2026 SKUNKLA. All rights reserved.</small><small>Informational website · No online purchases or payments</small></div></footer>'

def metadata(text):
    if not text.startswith("---\n"):
        return {}, text
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        return {}, text
    data = {}
    for line in parts[1].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip('"').strip("'")
    return data, parts[2]

def markdown(text):
    out, listing = [], False
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            if listing:
                out.append("</ul>")
                listing = False
            continue
        if line.startswith("- "):
            if not listing:
                out.append("<ul>")
                listing = True
            out.append("<li>" + escape(line[2:]) + "</li>")
        else:
            if listing:
                out.append("</ul>")
                listing = False
            level = len(line) - len(line.lstrip("#"))
            if 1 <= level <= 3 and line[level:level+1] == " ":
                out.append(f"<h{level}>{escape(line[level+1:])}</h{level}>")
            else:
                out.append("<p>" + escape(line) + "</p>")
    if listing:
        out.append("</ul>")
    return "\n".join(out)

def main():
    posts = []
    for source in sorted(CONTENT.glob("*.md")):
        if source.name == "README.md" or not re.fullmatch(r"[a-z0-9-]+", source.stem):
            continue
        meta, body = metadata(source.read_text(encoding="utf-8"))
        if not meta.get("title"):
            continue
        slug = source.stem
        title = escape(meta["title"])
        date = escape(meta.get("date", "")[:10])
        summary = escape(meta.get("summary", ""))
        article = f'{START}<title>{title} | SKUNKLA Journal</title></head><body>{HEADER}<main id="main"><article class="journal-article"><a href="./index.html">← Back to journal</a><p class="kicker">{date}</p><h1>{title}</h1><p>{summary}</p><div class="article-body">{markdown(body)}</div></article></main>{FOOTER}</body></html>'
        (OUTPUT / (slug + ".html")).write_text(article, encoding="utf-8")
        posts.append((meta.get("date", ""), slug, title, summary))
    posts.sort(reverse=True)
    cards = "".join(f'<article class="feature"><span class="kicker">{escape(date[:10])}</span><h3>{title}</h3><p>{summary}</p><a href="./{slug}.html">Read article →</a></article>' for date, slug, title, summary in posts)
    if not cards:
        cards = '<p>Articles will appear here once published.</p>'
    index = f'{START}<title>Journal | SKUNKLA Official</title></head><body>{HEADER}<main id="main"><section class="statement subpage-hero"><span class="kicker">THE JOURNAL</span><h1 class="page-heading">THE<br><i>JOURNAL.</i></h1><p>Brand stories and announcements.</p></section><section class="features"><div class="feature-grid">{cards}</div></section></main>{FOOTER}</body></html>'
    (OUTPUT / "index.html").write_text(index, encoding="utf-8")
    print(f"Generated {len(posts)} journal articles")

if __name__ == "__main__":
    main()
