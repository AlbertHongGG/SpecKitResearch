export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
}

export async function mapApiError(response: Response): Promise<ApiError> {
  const fallback: ApiError = {
    statusCode: response.status,
    errorCode: response.ok ? 'UNKNOWN' : 'HTTP_ERROR',
    message: response.statusText || 'Unexpected API error.',
  };

  try {
    const payload = (await response.json()) as Partial<ApiError>;
    return {
      statusCode: payload.statusCode ?? fallback.statusCode,
      errorCode: payload.errorCode ?? fallback.errorCode,
      message: payload.message ?? fallback.message,
    };
  } catch {
    return fallback;
  }
}
