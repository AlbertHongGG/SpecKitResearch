import { describe, expect, it } from 'vitest';
import { HttpError } from '../../http/errors';
import { assertWritableScope } from './archived';

describe('archived scope read-only', () => {
  it('allows writes when all scopes are active', () => {
    expect(() =>
      assertWritableScope({
        projectStatus: 'active',
        boardStatus: 'active',
        listStatus: 'active',
      })
    ).not.toThrow();
  });

  it('rejects when project is archived', () => {
    expect(() => assertWritableScope({ projectStatus: 'archived' })).toThrowError(HttpError);
    try {
      assertWritableScope({ projectStatus: 'archived' });
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.code).toBe('ARCHIVED_READ_ONLY');
      expect(e.details).toEqual({ scope: 'project' });
    }
  });

  it('rejects when board is archived', () => {
    expect(() => assertWritableScope({ projectStatus: 'active', boardStatus: 'archived' })).toThrowError(HttpError);
    try {
      assertWritableScope({ projectStatus: 'active', boardStatus: 'archived' });
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.code).toBe('ARCHIVED_READ_ONLY');
      expect(e.details).toEqual({ scope: 'board' });
    }
  });

  it('rejects when list is archived', () => {
    expect(() =>
      assertWritableScope({ projectStatus: 'active', boardStatus: 'active', listStatus: 'archived' })
    ).toThrowError(HttpError);
    try {
      assertWritableScope({ projectStatus: 'active', boardStatus: 'active', listStatus: 'archived' });
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.code).toBe('ARCHIVED_READ_ONLY');
      expect(e.details).toEqual({ scope: 'list' });
    }
  });
});
