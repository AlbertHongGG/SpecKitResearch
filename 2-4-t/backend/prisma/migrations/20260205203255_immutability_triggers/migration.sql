-- Defense-in-depth immutability for response data.

CREATE TRIGGER IF NOT EXISTS "Response_no_update"
BEFORE UPDATE ON "Response"
BEGIN
	SELECT RAISE(ABORT, 'immutable:Response');
END;

CREATE TRIGGER IF NOT EXISTS "Response_no_delete"
BEFORE DELETE ON "Response"
BEGIN
	SELECT RAISE(ABORT, 'immutable:Response');
END;

CREATE TRIGGER IF NOT EXISTS "Answer_no_update"
BEFORE UPDATE ON "Answer"
BEGIN
	SELECT RAISE(ABORT, 'immutable:Answer');
END;

CREATE TRIGGER IF NOT EXISTS "Answer_no_delete"
BEFORE DELETE ON "Answer"
BEGIN
	SELECT RAISE(ABORT, 'immutable:Answer');
END;