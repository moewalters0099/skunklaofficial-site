CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS blog_posts_published_at ON blog_posts(published_at);
