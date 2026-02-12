export type ResponseValidationError = {
  code:
    | 'ANSWER_FOR_HIDDEN_QUESTION'
    | 'REQUIRED_QUESTION_MISSING'
    | 'INVALID_ANSWER_TYPE'
    | 'INVALID_OPTION_VALUE'
    | 'INVALID_MATRIX_VALUE';
  message: string;
  question_id: string;
};

export function toBadRequestDetails(errors: ResponseValidationError[]) {
  return {
    errors
  };
}
