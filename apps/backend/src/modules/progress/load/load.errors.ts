// ==========================================
// ERROS TIPADOS PARA CÁLCULO DE CARGA
// ==========================================

export class InvalidRpeError extends Error {
  readonly code = 'INVALID_RPE';
  readonly receivedValue: unknown;

  constructor(received: unknown) {
    super(`RPE inválido: esperado inteiro entre 1 e 10, recebido ${received}`);
    this.name = 'InvalidRpeError';
    this.receivedValue = received;
  }
}

export class InvalidDurationError extends Error {
  readonly code = 'INVALID_DURATION';
  readonly receivedValue: unknown;

  constructor(received: unknown) {
    super(`Duração inválida: esperado inteiro entre 1 e 86400 segundos, recebido ${received}`);
    this.name = 'InvalidDurationError';
    this.receivedValue = received;
  }
}
