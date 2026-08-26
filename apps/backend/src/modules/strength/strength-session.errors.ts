import { HttpError } from '../../utils/httpError.js';

export class StrengthSessionNotFoundError extends HttpError {
  constructor(sessionId: string) {
    super(404, 'STRENGTH_SESSION_NOT_FOUND', { sessionId });
  }
}

export class StrengthSessionAlreadyActiveError extends HttpError {
  constructor() {
    super(409, 'STRENGTH_SESSION_ALREADY_ACTIVE', {
      message: 'Você já tem uma sessão de musculação ativa.',
    });
  }
}

export class StrengthSessionNotActiveError extends HttpError {
  constructor(currentStatus: string) {
    super(409, 'STRENGTH_SESSION_NOT_ACTIVE', { currentStatus });
  }
}

export class StrengthSessionVersionConflictError extends HttpError {
  constructor(serverVersion: number) {
    super(409, 'STRENGTH_SESSION_VERSION_CONFLICT', {
      message: 'A sessão foi atualizada em outro dispositivo.',
      serverVersion,
    });
  }
}

export class StrengthExerciseNotFoundError extends HttpError {
  constructor(exerciseId: string) {
    super(404, 'STRENGTH_EXERCISE_ENTRY_NOT_FOUND', { exerciseId });
  }
}

export class StrengthSetNotFoundError extends HttpError {
  constructor(setId: string) {
    super(404, 'STRENGTH_SET_NOT_FOUND', { setId });
  }
}

export class StrengthSessionNoExercisesError extends HttpError {
  constructor() {
    super(422, 'STRENGTH_SESSION_NO_EXERCISES', {
      message: 'A sessão não possui exercícios para ser finalizada.',
    });
  }
}

export class LibraryExerciseNotFoundError extends HttpError {
  constructor(key: string) {
    super(404, 'EXERCISE_NOT_FOUND', { key });
  }
}
