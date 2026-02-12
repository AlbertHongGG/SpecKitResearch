import { ConflictException } from '@nestjs/common';

export type ConflictCurrentState = Record<string, unknown>;

export function conflictWithCurrentState(args: {
    code: string;
    message: string;
    current: ConflictCurrentState;
}) {
    return new ConflictException({
        code: args.code,
        message: args.message,
        details: {
            current: args.current,
        },
    });
}
