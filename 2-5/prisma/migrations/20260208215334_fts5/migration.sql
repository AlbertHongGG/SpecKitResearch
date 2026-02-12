-- SQLite FTS5 tables + triggers for public search.

-- Threads: index title + content, keep threadId for joining.
CREATE VIRTUAL TABLE IF NOT EXISTS thread_fts
USING fts5(
	threadId UNINDEXED,
	title,
	content
);

CREATE TRIGGER IF NOT EXISTS thread_fts_ai AFTER INSERT ON Thread BEGIN
	INSERT INTO thread_fts(threadId, title, content)
	VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS thread_fts_ad AFTER DELETE ON Thread BEGIN
	DELETE FROM thread_fts WHERE threadId = old.id;
END;

CREATE TRIGGER IF NOT EXISTS thread_fts_au AFTER UPDATE ON Thread BEGIN
	DELETE FROM thread_fts WHERE threadId = old.id;
	INSERT INTO thread_fts(threadId, title, content)
	VALUES (new.id, new.title, new.content);
END;

-- Posts: index reply content, keep postId/threadId for joining.
CREATE VIRTUAL TABLE IF NOT EXISTS post_fts
USING fts5(
	postId UNINDEXED,
	threadId UNINDEXED,
	content
);

CREATE TRIGGER IF NOT EXISTS post_fts_ai AFTER INSERT ON Post BEGIN
	INSERT INTO post_fts(postId, threadId, content)
	VALUES (new.id, new.threadId, new.content);
END;

CREATE TRIGGER IF NOT EXISTS post_fts_ad AFTER DELETE ON Post BEGIN
	DELETE FROM post_fts WHERE postId = old.id;
END;

CREATE TRIGGER IF NOT EXISTS post_fts_au AFTER UPDATE ON Post BEGIN
	DELETE FROM post_fts WHERE postId = old.id;
	INSERT INTO post_fts(postId, threadId, content)
	VALUES (new.id, new.threadId, new.content);
END;

-- Backfill (important): triggers don't index existing rows.
DELETE FROM thread_fts;
DELETE FROM post_fts;

INSERT INTO thread_fts(threadId, title, content)
SELECT id, title, content FROM Thread;

INSERT INTO post_fts(postId, threadId, content)
SELECT id, threadId, content FROM Post;