export const ERROR_CODES = {
  VALIDATION_ERROR: {
    status: 400,
    description: 'Zod validation error (schema mismatch)',
    userFacingMessage: '請確認輸入內容',
  },

  AUTH_REQUIRED: {
    status: 401,
    description: 'Unauthenticated or session expired',
    userFacingMessage: '需要登入',
  },

  FORBIDDEN: {
    status: 403,
    description: 'Authenticated but not authorized',
    userFacingMessage: '無權限',
  },

  NOT_FOUND: {
    status: 404,
    description: 'Resource not found (or hidden by authz)',
    userFacingMessage: '找不到資源',
  },

  EMAIL_IN_USE: {
    status: 409,
    description: 'Email already registered',
    userFacingMessage: 'Email 已存在',
  },

  CATEGORY_NAME_IN_USE: {
    status: 409,
    description: 'Category name already used for the user',
    userFacingMessage: '類別名稱重複',
  },

  CSRF_INVALID: {
    status: 403,
    description: 'CSRF token missing or invalid',
    userFacingMessage: '請求無效（CSRF）',
  },

  INTERNAL_ERROR: {
    status: 500,
    description: 'Unexpected server error',
    userFacingMessage: '系統發生錯誤，請稍後再試',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
