export type ApiErrorMessage = {
  title: string;
  description: string;
};

const MESSAGES: Record<number, ApiErrorMessage> = {
  401: {
    title: 'Authentication required',
    description: 'Please sign in to continue.',
  },
  403: {
    title: 'Forbidden',
    description: 'You do not have permission to access this resource.',
  },
  404: {
    title: 'Not found',
    description: 'The requested resource does not exist.',
  },
  409: {
    title: 'Conflict',
    description: 'The request could not be completed because the state changed.',
  },
};

export function mapApiStatusToMessage(status: number): ApiErrorMessage {
  if (status in MESSAGES) {
    return MESSAGES[status];
  }

  if (status >= 500) {
    return {
      title: 'Server error',
      description: 'Please try again in a moment.',
    };
  }

  return {
    title: 'Request failed',
    description: 'Unexpected API response.',
  };
}
