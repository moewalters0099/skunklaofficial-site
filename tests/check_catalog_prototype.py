#!/usr/bin/env python3
"""Static safety and structure checks for the unpublished design prototype."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "prototypes" / "catalog-layout.html"
html = PAGE.read_text(encoding="utf-8")

class Audit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.filters = []
        self.ids = set()
        self.images = []
        self.scripts = 0
        self.local_links = []
        self.search_inputs = []
        self.labels = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            assert attrs["id"] not in self.ids, f"Duplicate ID: {attrs['id']}"
            self.ids.add(attrs["id"])
        if tag == "article" and "tile" in attrs.get("class", "").split():
            self.cards.append(attrs)
        if tag == "button" and "data-filter" in attrs:
            self.filters.append(attrs)
        if tag == "img":
            self.images.append(attrs)
        if tag in {"a", "img"}:
            target = attrs.get("href") if tag == "a" else attrs.get("src")
            if target and not target.startswith(("https://", "http://", "#", "mailto:", "data:")):
                self.local_links.append(target)
        if tag == "input" and attrs.get("type") == "search":
            self.search_inputs.append(attrs)
        if tag == "label":
            self.labels.append(attrs)
        if tag == "script":
            self.scripts += 1

audit = Audit()
audit.feed(html)
assert len(audit.cards) == 12, f"Expected 12 design cards, found {len(audit.cards)}"
categories = {"identity", "graphics", "editorial", "campaigns"}
assert {x.get("data-category") for x in audit.cards} == categories
assert {x["data-filter"] for x in audit.filters} == categories | {"all"}
assert all(x.get("aria-pressed") in {"true", "false"} for x in audit.filters)
assert {"results", "concept-search", "empty-state"}.issubset(audit.ids)
assert all(x.get("alt") for x in audit.images), "All images require alt text"
assert audit.scripts == 1
assert len(audit.search_inputs) == 1
assert audit.search_inputs[0].get("id") == "concept-search"
assert any(x.get("for") == "concept-search" for x in audit.labels)
assert all((PAGE.parent / link.split("?", 1)[0]).resolve().is_file() for link in audit.local_links), f"Broken local asset or navigation link: {audit.local_links}"
assert "updateGallery()" in html and 'search.addEventListener("input",updateGallery)' in html
assert 'name="viewport"' in html
assert 'name="robots" content="noindex,nofollow"' in html
assert "@media(max-width:650px)" in html and "@media(max-width:560px)" in html
assert "No real products, prices, carts, payment collection, ordering, or checkout." in html
print("PASS: 12 cards, categories, filters, search, labeled input, local links, accessibility basics, mobile breakpoints, unpublished disclaimer")
