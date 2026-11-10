"""Tests for SKUNKLA static journal publishing."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "build_journal.py"
spec = importlib.util.spec_from_file_location("build_journal", SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class PublishingTests(unittest.TestCase):
    def test_html_escaped(self):
        self.assertIn("&lt;script&gt;", builder.markdown("<script>"))
        self.assertNotIn("<script>", builder.markdown("<script>"))

    def test_frontmatter(self):
        info, body = builder.metadata("---\ntitle: Example\ndate: 2026-11-10\n---\nHello")
        self.assertEqual(info["title"], "Example")
        self.assertEqual(body.strip(), "Hello")

    def test_build_generates_article_and_index(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "content/journal").mkdir(parents=True)
            (root / "blog").mkdir()
            (root / "content/journal/first-post.md").write_text(
                "---\ntitle: Site update\ndate: 2026-11-10\nsummary: An example.\n---\n# Hello\nA test paragraph.",
                encoding="utf-8",
            )
            old_content, old_output = builder.CONTENT, builder.OUTPUT
            try:
                builder.CONTENT = root / "content/journal"
                builder.OUTPUT = root / "blog"
                builder.main()
            finally:
                builder.CONTENT, builder.OUTPUT = old_content, old_output
            article = (root / "blog/first-post.html").read_text(encoding="utf-8")
            index = (root / "blog/index.html").read_text(encoding="utf-8")
            self.assertIn("Site update", article)
            self.assertIn("first-post.html", index)
            self.assertIn("<h1>Hello</h1>", article)

if __name__ == "__main__":
    unittest.main()
