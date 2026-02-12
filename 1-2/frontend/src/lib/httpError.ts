export class HttpError extends Error {
    status: number;
    code?: string;
    details?: unknown;
    fieldErrors?: Record<string, string[]>;

    constructor(args: { status: number; message: string; code?: string; details?: unknown; fieldErrors?: Record<string, string[]> }) {
        super(args.message);
        this.status = args.status;
        this.code = args.code;
        this.details = args.details;
        this.fieldErrors = args.fieldErrors;
    }
}

export function isHttpError(e: unknown): e is HttpError {
    return e instanceof HttpError;
}
