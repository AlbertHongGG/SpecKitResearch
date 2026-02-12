-- Thread full-text search index (SQLite FTS5)

-- Contentless FTS table, keyed by threadId.
CREATE VIRTUAL TABLE IF NOT EXISTS thread_fts USING fts5(
	threadId UNINDEXED,
	title,
	content,
	tokenize = 'unicode61 remove_diacritics 2'
);

-- Initial backfill.
INSERT INTO thread_fts(threadId, title, content)
SELECT id, title, COALESCE(content, '')
FROM Thread;

-- Keep index in sync.
CREATE TRIGGER IF NOT EXISTS thread_fts_ai AFTER INSERT ON Thread BEGIN
	INSERT INTO thread_fts(threadId, title, content)
	VALUES (new.id, new.title, COALESCE(new.content, ''));
END;

CREATE TRIGGER IF NOT EXISTS thread_fts_ad AFTER DELETE ON Thread BEGIN
	DELETE FROM thread_fts WHERE threadId = old.id;
END;

CREATE TRIGGER IF NOT EXISTS thread_fts_au AFTER UPDATE OF title, content ON Thread BEGIN
	UPDATE thread_fts
	SET title = new.title,
			content = COALESCE(new.content, '')
	WHERE threadId = new.id;
END;